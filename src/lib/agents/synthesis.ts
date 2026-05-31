/**
 * Recommendation synthesis.
 *
 * Each of the 13 agents emits recommendations independently, which produces
 * duplicates (the same "Rotate exposed credentials" from repeated runs) and
 * cross-agent overlap (Security + Incident both reacting to one breach). This
 * orchestrator-level layer turns that raw stream into a single, coordinated
 * action plan: it dedupes, merges overlapping items across agents, and ranks by
 * a priority score = impact × confidence × risk-weight. Pure and unit-tested —
 * this is what makes the fleet feel like one coordinated team, not 13 scripts.
 */

import type { AgentKind, Recommendation, RiskLevel } from "@/lib/types";

const RISK_WEIGHT: Record<RiskLevel, number> = { low: 1, medium: 1.5, high: 2.25, critical: 3 };

/** Confidence each agent carries, 0–1 — coordination roles corroborate specialists. */
const AGENT_CONFIDENCE: Record<AgentKind, number> = {
  discovery: 0.8,
  privacy: 0.85,
  legal: 0.8,
  reputation: 0.7,
  security: 0.9,
  deepfake: 0.75,
  executive: 0.85,
  business: 0.8,
  orchestrator: 0.95,
  incident: 0.9,
  compliance: 0.85,
  threat_intel: 0.8,
  vendor: 0.75,
};

export interface SynthesizedRecommendation extends Recommendation {
  /** Distinct agents that independently surfaced this action. */
  corroboratingAgents: AgentKind[];
  /** 0–1 blended confidence (rises when multiple agents agree). */
  confidence: number;
  /** Ranking score = impact × confidence × risk-weight. */
  priority: number;
  /** How many raw recommendations were folded into this one. */
  mergedCount: number;
}

export interface SynthesisResult {
  plan: SynthesizedRecommendation[];
  /** Raw recommendations received before synthesis. */
  rawCount: number;
  /** Duplicates/overlaps removed. */
  deduped: number;
  /** Total projected score reduction from the de-conflicted plan. */
  projectedImpact: number;
}

/** Normalize a title into a dedupe key (case/space/punctuation-insensitive). */
export function dedupeKey(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * Synthesize a coordinated action plan from raw agent recommendations.
 *
 * - Recommendations with the same normalized title are merged into one.
 * - Merged confidence rises with each corroborating *distinct* agent (agreement
 *   is signal) but is capped at 0.99.
 * - Impact for a merged item is the max single impact (not the sum — they target
 *   the same issue) plus a small corroboration bonus.
 * - Priority = impact × confidence × risk-weight; the plan is sorted by it.
 */
export function synthesizeRecommendations(raw: Recommendation[]): SynthesisResult {
  const groups = new Map<string, Recommendation[]>();
  for (const r of raw) {
    const key = dedupeKey(r.title);
    const list = groups.get(key) ?? [];
    list.push(r);
    groups.set(key, list);
  }

  const plan: SynthesizedRecommendation[] = [];
  for (const list of groups.values()) {
    // Representative = highest single-impact item in the group.
    const rep = list.reduce((a, b) => (b.impact > a.impact ? b : a));
    const agents = [...new Set(list.map((r) => r.agent))];
    const baseConf = Math.max(...agents.map((a) => AGENT_CONFIDENCE[a] ?? 0.7));
    // Each *additional* corroborating agent adds 5% confidence, capped.
    const confidence = clamp01(Math.min(0.99, baseConf + (agents.length - 1) * 0.05));
    // Max impact + small bonus for corroboration (capped at +20%).
    const impact = Math.round(rep.impact * (1 + Math.min(0.2, (agents.length - 1) * 0.1)));
    const priority = Math.round(impact * confidence * RISK_WEIGHT[rep.riskLevel] * 10) / 10;

    plan.push({
      ...rep,
      impact,
      corroboratingAgents: agents,
      confidence: Math.round(confidence * 100) / 100,
      priority,
      mergedCount: list.length,
    });
  }

  plan.sort((a, b) => b.priority - a.priority);

  return {
    plan,
    rawCount: raw.length,
    deduped: raw.length - plan.length,
    projectedImpact: plan.reduce((s, r) => s + r.impact, 0),
  };
}
