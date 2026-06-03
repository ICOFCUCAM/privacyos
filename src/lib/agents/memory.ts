/**
 * Agent memory / learning loop.
 *
 * The fleet learns from history. Every approved recommendation becomes a tracked
 * Case, which is a labelled training signal: it tells us which agents' advice the
 * user acts on. This module derives a per-agent track record from that history
 * and applies it to the live plan in two ways:
 *
 *   1. Suppression — a recommendation whose work is already an open case is
 *      hidden (don't nag about work in flight).
 *   2. Reinforcement — agents whose recommendations the user historically
 *      approves earn a confidence/priority boost; ignored agents are damped.
 *
 * Pure and unit-tested. Operates on data already returned by getDataset (cases +
 * recommendations), so it works in both live and demo modes.
 */

import type { AgentKind, Case } from "@/lib/types";
import type { SynthesizedRecommendation } from "./synthesis";
import { dedupeKey } from "./synthesis";

export interface AgentTrackRecord {
  agent: AgentKind;
  /** Cases opened from this agent's approved recommendations. */
  approvals: number;
  /** Learning multiplier applied to this agent's confidence (0.85–1.25). */
  weight: number;
}

/**
 * Derive per-agent track record from the case history. More approvals → higher
 * trust (capped); agents with no track record sit at neutral 1.0.
 */
export function agentTrackRecord(cases: Case[]): Map<AgentKind, AgentTrackRecord> {
  const counts = new Map<AgentKind, number>();
  for (const c of cases) counts.set(c.assignedAgent, (counts.get(c.assignedAgent) ?? 0) + 1);

  const map = new Map<AgentKind, AgentTrackRecord>();
  for (const [agent, approvals] of counts) {
    // +5% confidence per approval, capped at +25%.
    const weight = Math.min(1.25, 1 + approvals * 0.05);
    map.set(agent, { agent, approvals, weight });
  }
  return map;
}

export interface MemoryResult {
  plan: SynthesizedRecommendation[];
  /** Recommendations hidden because their work is already an open case. */
  suppressed: number;
  /** Agents whose advice was reinforced by track record (weight > 1). */
  reinforcedAgents: AgentKind[];
}

const OPEN_CASE_STATUSES = new Set(["open", "in_progress", "awaiting_response", "escalated"]);

/**
 * Apply memory to a synthesized plan: suppress items already being worked as an
 * open case, and re-weight each remaining item's confidence/priority by the
 * owning agent's track record. The plan is re-sorted by the adjusted priority.
 */
export function applyMemory(
  plan: SynthesizedRecommendation[],
  cases: Case[],
): MemoryResult {
  const openCaseKeys = new Set(
    cases.filter((c) => OPEN_CASE_STATUSES.has(c.status)).map((c) => dedupeKey(c.title)),
  );
  const track = agentTrackRecord(cases);
  const reinforced = new Set<AgentKind>();

  const adjusted: SynthesizedRecommendation[] = [];
  let suppressed = 0;
  for (const r of plan) {
    if (openCaseKeys.has(dedupeKey(r.title))) {
      suppressed += 1;
      continue;
    }
    const weight = track.get(r.agent)?.weight ?? 1;
    if (weight > 1) reinforced.add(r.agent);
    const confidence = Math.min(0.99, Math.round(r.confidence * weight * 100) / 100);
    const priority = Math.round(r.priority * weight * 10) / 10;
    adjusted.push({ ...r, confidence, priority });
  }
  adjusted.sort((a, b) => b.priority - a.priority);

  return { plan: adjusted, suppressed, reinforcedAgents: [...reinforced] };
}
