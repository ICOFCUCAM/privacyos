/**
 * Protection profiling — the acquisition engine's targeting layer.
 *
 * After a free scan, silently classify the visitor into one or more protection
 * profiles (personal / family / reputation / executive / business) from the
 * shape of what was found, pick the dominant one, and recommend the single most
 * appropriate plan — so the scary window guides them to the right package
 * instead of showing every plan equally. Also computes the remaining-risk math
 * (found / removing / remaining) that becomes the upgrade trigger. Pure + tested.
 */

import type { MirrorCategory, ScaryMirrorReport } from "./scary-mirror";
import { PLANS } from "@/lib/billing/plans";

export type ProtectionProfile = "personal" | "family" | "reputation" | "executive" | "business";

/** How each exposure category points at a protection profile. */
const PROFILE_WEIGHTS: Record<MirrorCategory, Partial<Record<ProtectionProfile, number>>> = {
  brokers: { personal: 1, family: 0.4 },
  identity: { personal: 1, executive: 0.4 },
  breaches: { personal: 0.8, business: 0.3 },
  financial: { personal: 0.7, executive: 0.6, business: 0.4 },
  darkweb: { personal: 0.5, executive: 0.7 },
  reputation: { reputation: 1.3, executive: 0.3 },
  social: { reputation: 0.8, family: 0.5, personal: 0.3 },
};

export interface ProfileMatch {
  profile: ProtectionProfile;
  score: number;
}

export interface ProtectionRecommendation {
  /** The dominant protection profile. */
  primary: ProtectionProfile;
  /** All matched profiles (score > 0), strongest first. */
  matches: ProfileMatch[];
  /** The single plan to lead with. */
  planId: string;
  planName: string;
  /** Total exposures found. */
  found: number;
  /** Broker listings the free 10 removals will action. */
  removing: number;
  /** Exposures still at risk after the free removals — the upgrade trigger. */
  remaining: number;
}

const PROFILE_PLAN: Record<ProtectionProfile, string> = {
  family: "family",
  reputation: "rep-professional",
  executive: "exec-essential",
  business: "biz-startup",
  personal: "plus", // refined by severity below
};

function planName(id: string): string {
  return PLANS.find((p) => p.id === id)?.name ?? id;
}

/**
 * Classify a scan into protection profiles + the recommended plan and the
 * remaining-risk math. `freeRemovals` defaults to the free tier's 10.
 */
export function classifyProtection(report: ScaryMirrorReport, freeRemovals = 10): ProtectionRecommendation {
  const scores = new Map<ProtectionProfile, number>();
  for (const f of report.findings) {
    const weights = PROFILE_WEIGHTS[f.category];
    for (const [profile, w] of Object.entries(weights) as [ProtectionProfile, number][]) {
      scores.set(profile, (scores.get(profile) ?? 0) + f.count * w);
    }
  }

  const matches: ProfileMatch[] = [...scores.entries()]
    .map(([profile, score]) => ({ profile, score: Math.round(score * 10) / 10 }))
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score);

  const primary = matches[0]?.profile ?? "personal";

  // Personal recommendation scales with how exposed they are.
  let planId = PROFILE_PLAN[primary];
  if (primary === "personal") {
    planId = report.totalFindings >= 12 ? "premium" : "plus";
  }

  const brokers = report.findings.find((f) => f.category === "brokers")?.count ?? 0;
  const removing = Math.min(freeRemovals, brokers || report.totalFindings);
  const remaining = Math.max(0, report.totalFindings - removing);

  return {
    primary,
    matches,
    planId,
    planName: planName(planId),
    found: report.totalFindings,
    removing,
    remaining,
  };
}
