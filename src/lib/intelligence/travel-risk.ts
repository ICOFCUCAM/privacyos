/**
 * Travel Risk intelligence.
 *
 * Turns a travel itinerary into a pre-travel risk assessment by correlating the
 * destination advisory with the principal's own exposure + threat profile: a
 * leaked home address, location-exposure threats or dark-web chatter all raise
 * the risk of a specific trip. Produces a composite risk score, the contributing
 * factors, and a prioritized set of protective measures. Pure and unit-tested.
 */

import type { Exposure, RiskLevel, Threat } from "@/lib/types";
import type { TravelAlert } from "@/lib/suite-types";

const RISK_RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };
const RISK_WEIGHT: Record<RiskLevel, number> = { low: 10, medium: 22, high: 34, critical: 48 };
const DAY = 86_400_000;

export type TravelPosture = "low" | "guarded" | "elevated" | "high";

export interface TravelRiskFactor {
  label: string;
  detail: string;
  severity: RiskLevel;
}

export interface TravelMeasure {
  task: string;
  rationale: string;
  priority: "critical" | "high" | "standard";
}

export interface TravelAssessment {
  alert: TravelAlert;
  /** Days until departure; negative = already departed/completed. */
  daysUntil: number | null;
  upcoming: boolean;
  riskScore: number;
  posture: TravelPosture;
  factors: TravelRiskFactor[];
  measures: TravelMeasure[];
}

function daysUntil(travelDate: string | undefined, now: number): number | null {
  if (!travelDate) return null;
  const t = new Date(travelDate).getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - now) / DAY);
}

/** Derive the risk factors a trip inherits from the principal's profile. */
function deriveFactors(alert: TravelAlert, exposures: Exposure[], threats: Threat[]): TravelRiskFactor[] {
  const factors: TravelRiskFactor[] = [];
  const active = threats.filter((t) => !t.acknowledged);

  // Base: the destination advisory itself.
  factors.push({
    label: "Destination advisory",
    detail: alert.advisory,
    severity: alert.riskLevel,
  });

  const physical = active.filter((t) => t.kind === "doxxing" || t.kind === "location_exposure");
  if (physical.length > 0) {
    factors.push({
      label: "Location exposure",
      detail: `${physical.length} active doxxing/location signal(s) — movements may be predictable.`,
      severity: physical.reduce<RiskLevel>((a, t) => (RISK_RANK[t.riskLevel] > RISK_RANK[a] ? t.riskLevel : a), "low"),
    });
  }

  const addresses = exposures.filter((e) => e.category === "address");
  if (addresses.length > 0) {
    factors.push({
      label: "Residence exposed",
      detail: `Home address public in ${addresses.length} place(s) — residence is unattended while traveling.`,
      severity: addresses.reduce<RiskLevel>((a, e) => (RISK_RANK[e.riskLevel] > RISK_RANK[a] ? e.riskLevel : a), "low"),
    });
  }

  const creds = active.filter((t) => t.kind === "credential_leak");
  if (creds.length > 0) {
    factors.push({
      label: "Credential exposure",
      detail: "Leaked credentials raise account-takeover risk on untrusted networks abroad.",
      severity: "high",
    });
  }

  const darkweb = active.filter((t) => t.kind === "dark_web_mention");
  if (darkweb.length > 0) {
    factors.push({
      label: "Dark-web chatter",
      detail: "Active dark-web mentions warrant heightened monitoring during travel.",
      severity: "medium",
    });
  }

  return factors;
}

const POSTURE_BANDS: { min: number; posture: TravelPosture }[] = [
  { min: 70, posture: "high" },
  { min: 45, posture: "elevated" },
  { min: 22, posture: "guarded" },
  { min: 0, posture: "low" },
];

function postureFor(score: number): TravelPosture {
  return POSTURE_BANDS.find((b) => score >= b.min)!.posture;
}

/** Prioritized protective measures from the factors + posture. */
function deriveMeasures(factors: TravelRiskFactor[], posture: TravelPosture): TravelMeasure[] {
  const measures: TravelMeasure[] = [];
  const has = (label: string) => factors.some((f) => f.label === label);

  if (has("Location exposure") || posture === "high") {
    measures.push({ task: "Vary routes & use private transport", rationale: "Location signals make movements predictable.", priority: "critical" });
  }
  if (has("Residence exposed")) {
    measures.push({ task: "Arrange residence monitoring while away", rationale: "Home address is public and the residence is unattended.", priority: "high" });
  }
  if (has("Credential exposure")) {
    measures.push({ task: "Use a travel VPN & hardware-key MFA", rationale: "Leaked credentials are dangerous on untrusted networks.", priority: "high" });
  }
  if (has("Dark-web chatter")) {
    measures.push({ task: "Enable heightened threat monitoring for the trip window", rationale: "Active dark-web mentions detected.", priority: "standard" });
  }
  // Always-on baseline.
  measures.push({ task: "Carry minimal data on travel devices", rationale: "Limits blast radius if a device is lost or seized.", priority: "standard" });
  if (posture === "high" || posture === "elevated") {
    measures.push({ task: "Share itinerary with the security team & check-in schedule", rationale: "Elevated posture for this destination.", priority: "high" });
  }

  const rank = { critical: 0, high: 1, standard: 2 } as const;
  return measures.sort((a, b) => rank[a.priority] - rank[b.priority]);
}

export function assessTrip(
  alert: TravelAlert,
  exposures: Exposure[],
  threats: Threat[],
  now = Date.now(),
): TravelAssessment {
  const factors = deriveFactors(alert, exposures, threats);
  // Composite: destination base + the heaviest profile factor, then a small bump
  // per additional factor — capped at 100.
  const base = RISK_WEIGHT[alert.riskLevel];
  const profileFactors = factors.slice(1); // exclude the base advisory
  const heaviest = profileFactors.reduce((m, f) => Math.max(m, RISK_WEIGHT[f.severity]), 0);
  const extra = Math.max(0, profileFactors.length - 1) * 6;
  const riskScore = Math.min(100, Math.round(base + heaviest * 0.6 + extra));
  const posture = postureFor(riskScore);
  const du = daysUntil(alert.travelDate, now);
  return {
    alert,
    daysUntil: du,
    upcoming: du === null ? true : du >= 0,
    riskScore,
    posture,
    factors,
    measures: deriveMeasures(factors, posture),
  };
}

export interface TravelSummary {
  trips: number;
  upcoming: number;
  elevated: number;
  destinations: number;
  highestPosture: TravelPosture;
  /** Soonest upcoming assessment, if any. */
  next?: TravelAssessment;
}

const POSTURE_ORDER: TravelPosture[] = ["low", "guarded", "elevated", "high"];

export function summarizeTravel(assessments: TravelAssessment[]): TravelSummary {
  const upcoming = assessments.filter((a) => a.upcoming);
  const elevated = assessments.filter((a) => a.posture === "elevated" || a.posture === "high").length;
  const highestPosture = assessments.reduce<TravelPosture>(
    (a, x) => (POSTURE_ORDER.indexOf(x.posture) > POSTURE_ORDER.indexOf(a) ? x.posture : a),
    "low",
  );
  const next = [...upcoming]
    .filter((a) => a.daysUntil !== null)
    .sort((a, b) => (a.daysUntil! - b.daysUntil!))[0];
  return {
    trips: assessments.length,
    upcoming: upcoming.length,
    elevated,
    destinations: new Set(assessments.map((a) => a.alert.destination)).size,
    highestPosture,
    next,
  };
}

/** Enrich + order trips: upcoming first (soonest first), then by risk. */
export function assessTrips(
  alerts: TravelAlert[],
  exposures: Exposure[],
  threats: Threat[],
  now = Date.now(),
): TravelAssessment[] {
  return alerts
    .map((a) => assessTrip(a, exposures, threats, now))
    .sort((a, b) => {
      if (a.upcoming !== b.upcoming) return a.upcoming ? -1 : 1;
      if (a.upcoming && a.daysUntil !== null && b.daysUntil !== null) return a.daysUntil - b.daysUntil;
      return b.riskScore - a.riskScore;
    });
}
