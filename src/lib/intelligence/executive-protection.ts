/**
 * Executive Protection intelligence.
 *
 * The ExecutiveOS lens on a principal's risk: collapses the raw exposures and
 * threats into the protection domains a close-protection / corporate-security
 * team actually works — physical safety, impersonation, credentials, reputation
 * and residence — with a protection score, a recommended tier, per-domain status
 * and a prioritized hardening plan. Pure and unit-tested; derived deterministically
 * so it holds in live and demo modes.
 */

import type { Exposure, RiskLevel, Threat, ThreatKind } from "@/lib/types";

const RISK_RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };
const RISK_WEIGHT: Record<RiskLevel, number> = { low: 4, medium: 9, high: 16, critical: 26 };

export type ProtectionDomain = "physical" | "impersonation" | "credentials" | "reputation" | "residence";
export type DomainStatus = "secure" | "monitoring" | "action_required" | "critical";
export type PostureStatus = "secure" | "elevated" | "critical";
export type ProtectionTier = "Standard" | "Executive" | "Principal";

/** Threat kinds that feed each protection domain. */
const DOMAIN_THREATS: Record<Exclude<ProtectionDomain, "residence">, ThreatKind[]> = {
  physical: ["doxxing", "location_exposure"],
  impersonation: ["impersonation", "deepfake"],
  credentials: ["credential_leak", "dark_web_mention"],
  reputation: ["negative_press"],
};

const DOMAIN_LABEL: Record<ProtectionDomain, string> = {
  physical: "Physical safety",
  impersonation: "Impersonation & deepfakes",
  credentials: "Credentials & dark web",
  reputation: "Reputation",
  residence: "Residence & address",
};

const DOMAIN_ACTION: Record<ProtectionDomain, string> = {
  physical: "Suppress location data and brief the close-protection team.",
  impersonation: "File takedowns and verify the principal's authentic channels.",
  credentials: "Force credential rotation and enable hardware-key MFA.",
  reputation: "Engage reputation counter-measures and monitor sentiment.",
  residence: "Opt the home address out of people-search and property brokers.",
};

// Physical/residence weigh heavier for an executive than ordinary digital risk.
const DOMAIN_MULT: Record<ProtectionDomain, number> = {
  physical: 1.6, residence: 1.3, impersonation: 1.2, credentials: 1.0, reputation: 0.8,
};

export interface DomainAssessment {
  domain: ProtectionDomain;
  label: string;
  signals: number;
  highestRisk: RiskLevel | null;
  status: DomainStatus;
  detail: string;
  recommendedAction: string;
}

export interface ProtectiveAction {
  domain: ProtectionDomain;
  urgency: "critical" | "high" | "medium";
  action: string;
}

export interface ExecutivePosture {
  /** 0–100, higher = better protected (inverse of weighted exposure). */
  protectionScore: number;
  tier: ProtectionTier;
  status: PostureStatus;
  domains: DomainAssessment[];
  physicalSignals: number;
  residenceExposures: number;
  activeThreats: number;
  plan: ProtectiveAction[];
}

function statusFor(signals: number, highest: RiskLevel | null): DomainStatus {
  if (signals === 0 || highest === null) return "secure";
  if (highest === "critical") return "critical";
  if (highest === "high") return "action_required";
  return "monitoring";
}

function highestOf(levels: RiskLevel[]): RiskLevel | null {
  if (levels.length === 0) return null;
  return levels.reduce((a, b) => (RISK_RANK[b] > RISK_RANK[a] ? b : a));
}

function assessDomain(domain: ProtectionDomain, threats: Threat[], exposures: Exposure[]): DomainAssessment {
  let levels: RiskLevel[];
  if (domain === "residence") {
    levels = exposures.filter((e) => e.category === "address").map((e) => e.riskLevel);
  } else {
    const kinds = DOMAIN_THREATS[domain];
    levels = threats.filter((t) => !t.acknowledged && kinds.includes(t.kind)).map((t) => t.riskLevel);
  }
  const highestRisk = highestOf(levels);
  const status = statusFor(levels.length, highestRisk);
  const detail =
    status === "secure"
      ? "No active signals — protected."
      : `${levels.length} active signal${levels.length === 1 ? "" : "s"}, highest ${highestRisk}.`;
  return { domain, label: DOMAIN_LABEL[domain], signals: levels.length, highestRisk, status, detail, recommendedAction: DOMAIN_ACTION[domain] };
}

const ALL_DOMAINS: ProtectionDomain[] = ["physical", "impersonation", "credentials", "reputation", "residence"];

const URGENCY_RANK = { critical: 0, high: 1, medium: 2 } as const;

export function assessExecutive(exposures: Exposure[], threats: Threat[]): ExecutivePosture {
  const domains = ALL_DOMAINS.map((d) => assessDomain(d, threats, exposures));

  // Weighted exposure load → protection score (inverse).
  let load = 0;
  for (const a of domains) {
    if (a.highestRisk) load += RISK_WEIGHT[a.highestRisk] * DOMAIN_MULT[a.domain] * Math.min(a.signals, 3);
  }
  const protectionScore = Math.max(0, Math.min(100, Math.round(100 - load)));

  const physical = domains.find((d) => d.domain === "physical")!;
  const residence = domains.find((d) => d.domain === "residence")!;
  const activeThreats = threats.filter((t) => !t.acknowledged).length;

  // Posture status — physical/critical drives it hardest.
  const anyCritical = domains.some((d) => d.status === "critical");
  const anyAction = domains.some((d) => d.status === "action_required");
  const status: PostureStatus = anyCritical || protectionScore < 45 ? "critical" : anyAction || protectionScore < 75 ? "elevated" : "secure";

  // Recommended protection tier from the threat profile.
  const tier: ProtectionTier =
    physical.status === "critical" || anyCritical ? "Principal" : anyAction || activeThreats > 0 ? "Executive" : "Standard";

  // Prioritized hardening plan — one action per domain needing attention.
  const plan: ProtectiveAction[] = domains
    .filter((d) => d.status !== "secure")
    .map((d): ProtectiveAction => ({
      domain: d.domain,
      urgency: d.status === "critical" ? "critical" : d.status === "action_required" ? "high" : "medium",
      action: d.recommendedAction,
    }))
    .sort((a, b) => URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency]);

  return {
    protectionScore,
    tier,
    status,
    domains,
    physicalSignals: physical.signals,
    residenceExposures: residence.signals,
    activeThreats,
    plan,
  };
}
