/**
 * Autonomy mode — the consent dial that closes the activation loop.
 *
 * After the Scary Mirror shows the customer what's exposed, they make ONE
 * decision: how hands-on do they want to be? That choice is both a UX setting
 * and a consent contract — it authorizes how much the platform may act on their
 * behalf without asking. It maps directly onto the approval threshold the
 * Protection Home "needs you" queue already uses.
 *
 * Pure and unit-tested. Three modes, defaulted by subscription tier.
 */

import type { RiskLevel } from "@/lib/types";

export type AutonomyMode = "autopilot" | "hybrid" | "advisor";

/** Cookie that persists the customer's chosen autonomy mode. */
export const AUTONOMY_COOKIE = "po_autonomy";

export interface AutonomyMeta {
  mode: AutonomyMode;
  label: string;
  tagline: string;
  /** The lowest risk level that still requires the human; anything below is auto-handled. */
  approvalFloor: RiskLevel;
}

export const AUTONOMY_MODES: AutonomyMode[] = ["autopilot", "hybrid", "advisor"];

export const AUTONOMY_META: Record<AutonomyMode, AutonomyMeta> = {
  autopilot: {
    mode: "autopilot",
    label: "Autopilot",
    tagline: "Just protect me — only ask me about critical decisions.",
    approvalFloor: "critical",
  },
  hybrid: {
    mode: "hybrid",
    label: "Check with me",
    tagline: "Handle the routine; run the important calls by me first.",
    approvalFloor: "high",
  },
  advisor: {
    mode: "advisor",
    label: "I'll decide",
    tagline: "Recommend everything; nothing runs without my say-so.",
    approvalFloor: "low",
  },
};

const RISK_RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };

/** True when an action at this risk requires the human under the given mode. */
export function needsApproval(risk: RiskLevel, mode: AutonomyMode): boolean {
  return RISK_RANK[risk] >= RISK_RANK[AUTONOMY_META[mode].approvalFloor];
}

/** Pick a sensible default mode from the subscription plan id. */
export function defaultModeForPlan(planId?: string): AutonomyMode {
  if (!planId) return "autopilot";
  if (planId.startsWith("biz")) return "advisor";   // orgs want sign-off
  if (planId.startsWith("exec")) return "hybrid";   // executives want a say on the big calls
  return "autopilot";                                // personal/reputation: just handle it
}

/** Validate an untrusted string (e.g. a cookie) into a mode, with a fallback. */
export function coerceMode(value: string | undefined, fallback: AutonomyMode = "autopilot"): AutonomyMode {
  return value === "autopilot" || value === "hybrid" || value === "advisor" ? value : fallback;
}
