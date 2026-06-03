/**
 * Action economics — the cost/benefit an executive weighs per recommendation.
 *
 * Deterministically derives estimated effort, success probability and a tidy
 * benefit summary from a synthesized recommendation, so each action answers
 * "what will it take, how likely to succeed, and what do I gain?". Pure and
 * unit-tested.
 */

import type { AgentKind, RiskLevel } from "@/lib/types";
import type { SynthesizedRecommendation } from "./synthesis";

export interface ActionEconomics {
  /** Estimated hands-on effort, minutes (mostly automated → low). */
  effortMinutes: number;
  /** Probability the action succeeds, 0–100 (from confidence + corroboration). */
  successProbability: number;
  /** Risk-score reduction if actioned. */
  riskReduction: number;
  /** Whether this action can run fully autonomously (no human step). */
  autoExecutable: boolean;
}

// Base effort per owning agent — legal/executive need review; scans are instant.
const AGENT_EFFORT: Partial<Record<AgentKind, number>> = {
  discovery: 1,
  privacy: 3,
  security: 5,
  reputation: 8,
  deepfake: 6,
  legal: 10,
  executive: 12,
  business: 6,
  compliance: 8,
  vendor: 6,
  threat_intel: 2,
  incident: 4,
  orchestrator: 2,
};

// Actions that still require human sign-off (irreversible / legal).
const APPROVAL_AGENTS: AgentKind[] = ["legal", "executive"];

const RISK_EFFORT_MULT: Record<RiskLevel, number> = { low: 0.8, medium: 1, high: 1.2, critical: 1.4 };

export function actionEconomics(r: SynthesizedRecommendation): ActionEconomics {
  const base = AGENT_EFFORT[r.agent] ?? 5;
  const effortMinutes = Math.max(1, Math.round(base * RISK_EFFORT_MULT[r.riskLevel]));
  // Success probability tracks confidence, nudged up by agent corroboration.
  const corroborationBonus = Math.min(8, (r.corroboratingAgents.length - 1) * 4);
  const successProbability = Math.min(99, Math.round(r.confidence * 100) + corroborationBonus);
  return {
    effortMinutes,
    successProbability,
    riskReduction: r.impact,
    autoExecutable: !APPROVAL_AGENTS.includes(r.agent),
  };
}

/* ── Mission board (plan-level summary) ──────────────────────────────────── */

export interface MissionBoard {
  exposureScore: number;
  projectedScore: number;
  actionsRequired: number;
  /** Total estimated completion time across the plan, minutes. */
  estimatedMinutes: number;
  /** Plan-wide confidence (mean), 0–100. */
  confidence: number;
}

export function missionBoard(
  exposureScore: number,
  plan: SynthesizedRecommendation[],
): MissionBoard {
  const projectedScore = Math.max(0, exposureScore - plan.reduce((s, r) => s + r.impact, 0));
  const estimatedMinutes = plan.reduce((s, r) => s + actionEconomics(r).effortMinutes, 0);
  const confidence =
    plan.length === 0 ? 0 : Math.round((plan.reduce((s, r) => s + r.confidence, 0) / plan.length) * 100);
  return {
    exposureScore,
    projectedScore,
    actionsRequired: plan.length,
    estimatedMinutes,
    confidence,
  };
}
