/**
 * Threat-intelligence engine.
 *
 * Turns a flat list of threats into an intelligence center: a severity summary,
 * category grouping, per-threat intelligence scores (risk / confidence / source
 * reliability), and an agent-driven investigation timeline. Pure and
 * unit-tested — this is what shifts the page from "a feed of alerts" to "a feed
 * of investigations".
 */

import type { AgentKind, ExposureSource, RiskLevel, Threat, ThreatKind } from "@/lib/types";

const RISK_RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };

/* ── Summary ─────────────────────────────────────────────────────────────── */

export interface ThreatSummary {
  active: number;
  total: number;
  bySeverity: Record<RiskLevel, number>;
  latest?: Threat;
  highest?: Threat;
  /** Distinct agents currently working threats (from the timelines). */
  agentsWorking: number;
}

export function summarizeThreats(threats: Threat[]): ThreatSummary {
  const active = threats.filter((t) => !t.acknowledged);
  const bySeverity: Record<RiskLevel, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const t of active) bySeverity[t.riskLevel] += 1;
  const sortedByTime = [...threats].sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
  const sortedByRisk = [...active].sort(
    (a, b) => RISK_RANK[b.riskLevel] - RISK_RANK[a.riskLevel] || b.detectedAt.localeCompare(a.detectedAt),
  );
  return {
    active: active.length,
    total: threats.length,
    bySeverity,
    latest: sortedByTime[0],
    highest: sortedByRisk[0],
    // Each active threat is being worked by Discovery + Threat-Intel at minimum.
    agentsWorking: active.length > 0 ? Math.min(4, 2 + (bySeverity.critical > 0 ? 2 : bySeverity.high > 0 ? 1 : 0)) : 0,
  };
}

/* ── Categories ──────────────────────────────────────────────────────────── */

export interface ThreatCategoryMeta {
  kind: ThreatKind;
  label: string;
}

export const THREAT_CATEGORIES: Record<ThreatKind, string> = {
  credential_leak: "Credential Leak",
  dark_web_mention: "Dark Web Mention",
  deepfake: "Deepfake",
  impersonation: "Impersonation",
  doxxing: "Doxxing",
  location_exposure: "Location Exposure",
  negative_press: "Reputation Risk",
};

export interface ThreatGroup {
  kind: ThreatKind;
  label: string;
  count: number;
  topSeverity: RiskLevel;
  threats: Threat[];
}

/** Group threats by kind, ordered by worst severity then count. */
export function groupThreats(threats: Threat[]): ThreatGroup[] {
  const groups = new Map<ThreatKind, Threat[]>();
  for (const t of threats) {
    const list = groups.get(t.kind) ?? [];
    list.push(t);
    groups.set(t.kind, list);
  }
  return [...groups.entries()]
    .map(([kind, list]) => ({
      kind,
      label: THREAT_CATEGORIES[kind] ?? kind,
      count: list.length,
      topSeverity: list.reduce<RiskLevel>((acc, t) => (RISK_RANK[t.riskLevel] > RISK_RANK[acc] ? t.riskLevel : acc), "low"),
      threats: list.sort((a, b) => RISK_RANK[b.riskLevel] - RISK_RANK[a.riskLevel]),
    }))
    .sort((a, b) => RISK_RANK[b.topSeverity] - RISK_RANK[a.topSeverity] || b.count - a.count);
}

/* ── Intelligence score ──────────────────────────────────────────────────── */

export type SourceReliability = "Verified" | "Corroborated" | "Unverified";
export type Confidence = "High" | "Medium" | "Low";

export interface ThreatIntel {
  riskScore: number;
  confidence: Confidence;
  reliability: SourceReliability;
}

const SEVERITY_BASE: Record<RiskLevel, number> = { low: 25, medium: 50, high: 72, critical: 92 };

// Source reliability by origin — breach DBs and certs are verifiable; forums less so.
const SOURCE_RELIABILITY: Partial<Record<ExposureSource, SourceReliability>> = {
  breach_db: "Verified",
  dark_web: "Corroborated",
  public_record: "Verified",
  data_broker: "Verified",
  news: "Corroborated",
  social_media: "Unverified",
  forum: "Unverified",
  search_engine: "Corroborated",
  archive: "Corroborated",
  ai_generated: "Corroborated",
};

export function threatIntel(t: Threat): ThreatIntel {
  const reliability = SOURCE_RELIABILITY[t.source] ?? "Unverified";
  const confidence: Confidence =
    reliability === "Verified" ? "High" : reliability === "Corroborated" ? "Medium" : "Low";
  // Risk score = severity base, nudged by source reliability.
  const nudge = reliability === "Verified" ? 3 : reliability === "Unverified" ? -5 : 0;
  const riskScore = Math.max(0, Math.min(100, SEVERITY_BASE[t.riskLevel] + nudge));
  return { riskScore, confidence, reliability };
}

/* ── Investigation timeline ──────────────────────────────────────────────── */

export interface TimelineStep {
  agent: AgentKind | "user";
  label: string;
  /** Minutes after detection this step occurred (for ordering/display). */
  offsetMin: number;
}

/**
 * The agent-driven investigation a threat goes through. Deterministic from the
 * threat's kind + severity + acknowledged state, so the timeline is explainable.
 */
export function investigationTimeline(t: Threat): TimelineStep[] {
  const steps: TimelineStep[] = [
    { agent: "discovery", label: "Discovery Agent surfaced the signal", offsetMin: 0 },
    { agent: "threat_intel", label: "Threat Intelligence correlated & confirmed it", offsetMin: 6 },
  ];

  // Route to the owning responder by kind.
  if (t.kind === "credential_leak" || t.kind === "dark_web_mention") {
    steps.push({ agent: "security", label: "Security Agent assessed account-takeover risk", offsetMin: 12 });
  } else if (t.kind === "deepfake" || t.kind === "impersonation") {
    steps.push({ agent: "deepfake", label: "Deepfake Agent scored the media & assembled evidence", offsetMin: 12 });
  } else if (t.kind === "doxxing" || t.kind === "location_exposure") {
    steps.push({ agent: "executive", label: "Executive Protection assessed physical-security risk", offsetMin: 12 });
  } else if (t.kind === "negative_press") {
    steps.push({ agent: "reputation", label: "Reputation Agent classified sentiment & reach", offsetMin: 12 });
  }

  if (t.riskLevel === "critical" || t.riskLevel === "high") {
    steps.push({ agent: "incident", label: "Incident Response opened a containment playbook", offsetMin: 18 });
    if (t.kind === "credential_leak" || t.kind === "deepfake" || t.kind === "impersonation") {
      steps.push({ agent: "legal", label: "Legal Agent preparing takedown / erasure actions", offsetMin: 24 });
    }
  }

  if (t.acknowledged) {
    steps.push({ agent: "user", label: "Acknowledged by analyst", offsetMin: 30 });
  }
  return steps;
}
