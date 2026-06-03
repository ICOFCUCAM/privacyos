/**
 * PrivacyOS proprietary risk scoring model.
 *
 * Produces a 0–100 exposure score (higher = more exposed) plus a five-axis
 * breakdown (identity, reputation, financial, security, family). The model is
 * deterministic and unit-tested so scores are explainable and auditable — a
 * hard requirement for compliance and executive reporting.
 */

import type {
  Exposure,
  ExposureCategory,
  RiskLevel,
  RiskScore,
  Threat,
} from "@/lib/types";
import { riskLevelFromScore } from "./bands";

/** Base severity weight per risk level. */
const LEVEL_WEIGHT: Record<RiskLevel, number> = {
  low: 8,
  medium: 20,
  high: 38,
  critical: 60,
};

/** How strongly an active (un-removed) exposure counts vs. a remediated one. */
const STATUS_MULTIPLIER: Record<string, number> = {
  discovered: 1,
  triaged: 1,
  removal_requested: 0.7,
  in_progress: 0.6,
  removed: 0.05,
  monitoring: 0.15,
  reappeared: 1.1,
};

/**
 * Maps each exposure category onto the five risk axes. Weights sum to ~1 per
 * category so a single exposure can contribute to multiple axes (e.g. a leaked
 * address is both an identity and a family risk).
 */
const CATEGORY_AXES: Record<
  ExposureCategory,
  Partial<Record<keyof Omit<RiskScore, "overall" | "trend">, number>>
> = {
  name: { identity: 0.6, reputation: 0.4 },
  alias: { identity: 0.7, reputation: 0.3 },
  email: { identity: 0.5, security: 0.5 },
  phone: { identity: 0.4, security: 0.6 },
  address: { identity: 0.4, family: 0.4, security: 0.2 },
  family: { family: 0.8, identity: 0.2 },
  photo: { reputation: 0.5, family: 0.3, identity: 0.2 },
  username: { identity: 0.6, security: 0.4 },
  employer: { reputation: 0.5, identity: 0.5 },
  financial: { financial: 0.8, security: 0.2 },
  credential: { security: 0.7, financial: 0.3 },
};

type Axis = keyof Omit<RiskScore, "overall" | "trend">;
const AXES: Axis[] = ["identity", "reputation", "financial", "security", "family"];

/** Logistic compression so a few criticals dominate but the score saturates < 100. */
function compress(raw: number): number {
  // raw is an unbounded positive accumulation; map to 0–100.
  const score = 100 * (1 - Math.exp(-raw / 120));
  return Math.round(Math.min(100, Math.max(0, score)));
}

/**
 * Effective weight of one exposure after applying severity, remediation status,
 * and a small recency boost (recently seen exposures matter more).
 */
export function exposureWeight(exposure: Exposure, now = Date.now()): number {
  const base = LEVEL_WEIGHT[exposure.riskLevel];
  const status = STATUS_MULTIPLIER[exposure.status] ?? 1;
  const ageDays = (now - new Date(exposure.lastSeenAt).getTime()) / 86_400_000;
  const recency = ageDays <= 30 ? 1.15 : ageDays <= 180 ? 1 : 0.85;
  return base * status * recency;
}

/**
 * Compute a full RiskScore for a subject from their exposures and active
 * threats. Threats add an acute, time-sensitive contribution on top of the
 * standing exposure footprint.
 */
export function computeRiskScore(
  exposures: Exposure[],
  threats: Threat[] = [],
  trend: RiskScore["trend"] = [],
  now = Date.now(),
): RiskScore {
  const axisRaw: Record<Axis, number> = {
    identity: 0,
    reputation: 0,
    financial: 0,
    security: 0,
    family: 0,
  };
  let overallRaw = 0;

  for (const exposure of exposures) {
    const weight = exposureWeight(exposure, now);
    overallRaw += weight;
    const axes = CATEGORY_AXES[exposure.category] ?? {};
    for (const axis of AXES) {
      const share = axes[axis];
      if (share) axisRaw[axis] += weight * share;
    }
  }

  // Unacknowledged threats are acute: they push security/reputation hard.
  for (const threat of threats) {
    if (threat.acknowledged) continue;
    const weight = LEVEL_WEIGHT[threat.riskLevel] * 0.9;
    overallRaw += weight;
    if (threat.kind === "negative_press" || threat.kind === "deepfake") {
      axisRaw.reputation += weight * 0.7;
      axisRaw.security += weight * 0.3;
    } else if (threat.kind === "doxxing" || threat.kind === "location_exposure") {
      axisRaw.family += weight * 0.5;
      axisRaw.security += weight * 0.5;
    } else {
      axisRaw.security += weight;
    }
  }

  return {
    overall: compress(overallRaw),
    identity: compress(axisRaw.identity * 1.4),
    reputation: compress(axisRaw.reputation * 1.4),
    financial: compress(axisRaw.financial * 1.4),
    security: compress(axisRaw.security * 1.4),
    family: compress(axisRaw.family * 1.4),
    trend,
  };
}

/** Convert a 0–100 exposure score into a coarse risk band for UI + reports. */
export function scoreToLevel(score: number): RiskLevel {
  return riskLevelFromScore(score);
}
