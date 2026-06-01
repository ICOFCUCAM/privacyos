/**
 * Executive Protection OS — risk indices.
 *
 * The Executive Risk Score: a composite plus five sub-indices (personal, family,
 * physical, digital, travel) a close-protection team tracks. Each is 0–100 where
 * higher = more risk, derived deterministically from the principal's exposures,
 * threats, family roster and travel itinerary. Pure and unit-tested.
 */

import type { Exposure, RiskLevel, Threat } from "@/lib/types";
import type { FamilyMember, TravelAlert } from "@/lib/suite-types";

const RISK_WEIGHT: Record<RiskLevel, number> = { low: 8, medium: 18, high: 32, critical: 48 };
const RISK_RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };

export type RiskBand = "low" | "elevated" | "high" | "critical";

export interface ExecutiveRiskIndices {
  /** Composite executive risk, 0–100 (higher = more at risk). */
  overall: number;
  personal: number;
  family: number;
  physical: number;
  digital: number;
  travel: number;
  band: RiskBand;
}

export interface RiskInput {
  exposures: Exposure[];
  threats: Threat[];
  family: FamilyMember[];
  travel: TravelAlert[];
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

const PHYSICAL_CATEGORIES = new Set(["address", "family", "photo"]);
const DIGITAL_CATEGORIES = new Set(["email", "username", "credential", "financial"]);
const PHYSICAL_THREATS = new Set(["doxxing", "location_exposure"]);
const DIGITAL_THREATS = new Set(["credential_leak", "dark_web_mention", "deepfake", "impersonation"]);

function activeThreats(threats: Threat[]): Threat[] {
  return threats.filter((t) => !t.acknowledged);
}

export function bandFor(score: number): RiskBand {
  if (score >= 75) return "critical";
  if (score >= 50) return "high";
  if (score >= 25) return "elevated";
  return "low";
}

export function executiveRiskIndices(input: RiskInput): ExecutiveRiskIndices {
  const at = activeThreats(input.threats);

  // Personal — the principal's own digital/identity footprint.
  const personal = clamp(input.exposures.reduce((s, e) => s + RISK_WEIGHT[e.riskLevel], 0) + at.reduce((s, t) => s + RISK_WEIGHT[t.riskLevel] * 0.5, 0));

  // Physical — address/family/photo exposure + doxxing/location threats.
  const physical = clamp(
    input.exposures.filter((e) => PHYSICAL_CATEGORIES.has(e.category)).reduce((s, e) => s + RISK_WEIGHT[e.riskLevel] * 1.3, 0) +
    at.filter((t) => PHYSICAL_THREATS.has(t.kind)).reduce((s, t) => s + RISK_WEIGHT[t.riskLevel] * 1.4, 0),
  );

  // Digital — credentials, accounts, dark web, impersonation.
  const digital = clamp(
    input.exposures.filter((e) => DIGITAL_CATEGORIES.has(e.category)).reduce((s, e) => s + RISK_WEIGHT[e.riskLevel], 0) +
    at.filter((t) => DIGITAL_THREATS.has(t.kind)).reduce((s, t) => s + RISK_WEIGHT[t.riskLevel] * 1.1, 0),
  );

  // Family — relatives' risk; minors weigh heavier.
  const family = clamp(input.family.reduce((s, m) => s + RISK_WEIGHT[m.riskLevel] * (m.isMinor ? 1.4 : 1) + Math.min(m.exposuresCount, 4) * 3, 0));

  // Travel — upcoming/active itinerary risk.
  const travel = clamp(input.travel.reduce((s, t) => s + RISK_WEIGHT[t.riskLevel] * 1.2, 0));

  // Composite — physical & family weigh most for a principal.
  const overall = clamp(physical * 0.28 + family * 0.22 + digital * 0.2 + personal * 0.18 + travel * 0.12);

  return { overall, personal, family, physical, digital, travel, band: bandFor(overall) };
}

export interface RiskIndexMeta {
  key: keyof Omit<ExecutiveRiskIndices, "overall" | "band">;
  label: string;
}

export const RISK_INDEX_META: RiskIndexMeta[] = [
  { key: "personal", label: "Personal" },
  { key: "family", label: "Family" },
  { key: "physical", label: "Physical security" },
  { key: "digital", label: "Digital security" },
  { key: "travel", label: "Travel security" },
];

export { RISK_RANK };
