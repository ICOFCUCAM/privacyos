/**
 * Canonical scoring bands — the single source of truth for risk/protection
 * thresholds. Multiple surfaces previously redefined these cut points inline
 * (risk-score, protection-suite, protection-home), which let them drift. Every
 * band derives from the constants here so a score always lands in the same band
 * everywhere.
 */

import type { RiskLevel } from "@/lib/types";

/** Risk cut points (higher score = worse). */
export const RISK_BAND_CUTS = { critical: 75, high: 50, medium: 25 } as const;

/** 0 = low, 1 = medium, 2 = high, 3 = critical. */
export function riskBandIndex(score: number): 0 | 1 | 2 | 3 {
  if (score >= RISK_BAND_CUTS.critical) return 3;
  if (score >= RISK_BAND_CUTS.high) return 2;
  if (score >= RISK_BAND_CUTS.medium) return 1;
  return 0;
}

const RISK_LEVELS: RiskLevel[] = ["low", "medium", "high", "critical"];

/** A 0–100 risk/exposure score → its risk level. */
export function riskLevelFromScore(score: number): RiskLevel {
  return RISK_LEVELS[riskBandIndex(score)];
}

/** Protection cut points (higher score = safer) — the inverse framing. */
export const PROTECTION_BAND_CUTS = { secure: 85, protected: 70, fair: 50 } as const;

export type ProtectionBand = "exposed" | "fair" | "protected" | "secure";

/** A 0–100 protection score → its protection band. */
export function protectionBand(score: number): ProtectionBand {
  if (score >= PROTECTION_BAND_CUTS.secure) return "secure";
  if (score >= PROTECTION_BAND_CUTS.protected) return "protected";
  if (score >= PROTECTION_BAND_CUTS.fair) return "fair";
  return "exposed";
}
