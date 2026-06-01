/**
 * Executive Protection OS — threat-actor tracking.
 *
 * Clusters the principal's threats into actor profiles by origin, tracks their
 * escalation (dormant → low → rising → active) and flags harassment campaigns.
 * Derived from the threat feed. Pure and unit-tested.
 */

import type { RiskLevel, Threat, ThreatKind } from "@/lib/types";

const RISK_RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };
const DAY = 86_400_000;

export type Escalation = "dormant" | "low" | "rising" | "active";

export interface ThreatActor {
  id: string;
  label: string;
  source: string;
  kinds: ThreatKind[];
  threatCount: number;
  highestRisk: RiskLevel;
  escalation: Escalation;
  /** Active harassment campaign (doxxing / impersonation / dark-web targeting). */
  harassment: boolean;
  firstSeen: string;
  lastSeen: string;
  timeline: { at: string; title: string; riskLevel: RiskLevel; kind: ThreatKind }[];
}

const SOURCE_LABEL: Record<string, string> = {
  dark_web: "Dark-web actor",
  social_media: "Social-media actor",
  forum: "Forum actor",
  breach_db: "Breach-sourced actor",
  data_broker: "Broker-sourced actor",
  search_engine: "Open-web actor",
  news: "Media-driven actor",
  public_record: "Public-record actor",
  archive: "Archived-content actor",
  ai_generated: "Synthetic-media actor",
};

const HARASSMENT_KINDS = new Set<ThreatKind>(["doxxing", "impersonation", "dark_web_mention"]);

function escalationFor(count: number, lastSeen: string, highest: RiskLevel, now: number): Escalation {
  const days = lastSeen ? (now - new Date(lastSeen).getTime()) / DAY : 999;
  if (days > 60) return "dormant";
  if (count >= 3 && days <= 14) return "active";
  if ((count >= 2 || RISK_RANK[highest] >= 2) && days <= 30) return "rising";
  return "low";
}

/** Build actor profiles from the threat feed, most-escalated first. */
export function buildThreatActors(threats: Threat[], now = Date.now()): ThreatActor[] {
  const active = threats.filter((t) => !t.acknowledged);
  const bySource = new Map<string, Threat[]>();
  for (const t of active) {
    const list = bySource.get(t.source) ?? [];
    list.push(t);
    bySource.set(t.source, list);
  }

  const ESC_RANK: Record<Escalation, number> = { active: 0, rising: 1, low: 2, dormant: 3 };

  const actors = [...bySource.entries()].map(([source, ts]) => {
    const sorted = [...ts].sort((a, b) => a.detectedAt.localeCompare(b.detectedAt));
    const highestRisk = ts.reduce<RiskLevel>((a, t) => (RISK_RANK[t.riskLevel] > RISK_RANK[a] ? t.riskLevel : a), "low");
    const lastSeen = sorted[sorted.length - 1]?.detectedAt ?? "";
    return {
      id: `actor-${source}`,
      label: SOURCE_LABEL[source] ?? `${source} actor`,
      source,
      kinds: [...new Set(ts.map((t) => t.kind))],
      threatCount: ts.length,
      highestRisk,
      escalation: escalationFor(ts.length, lastSeen, highestRisk, now),
      harassment: ts.some((t) => HARASSMENT_KINDS.has(t.kind)),
      firstSeen: sorted[0]?.detectedAt ?? "",
      lastSeen,
      timeline: sorted.map((t) => ({ at: t.detectedAt, title: t.title, riskLevel: t.riskLevel, kind: t.kind })),
    };
  });

  return actors.sort((a, b) => ESC_RANK[a.escalation] - ESC_RANK[b.escalation] || RISK_RANK[b.highestRisk] - RISK_RANK[a.highestRisk]);
}

export interface ThreatActorSummary {
  actors: number;
  active: number;
  harassmentCampaigns: number;
}

export function summarizeActors(actors: ThreatActor[]): ThreatActorSummary {
  return {
    actors: actors.length,
    active: actors.filter((a) => a.escalation === "active" || a.escalation === "rising").length,
    harassmentCampaigns: actors.filter((a) => a.harassment).length,
  };
}
