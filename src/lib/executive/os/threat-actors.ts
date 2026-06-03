/**
 * Executive Protection OS — threat-actor tracking.
 *
 * Clusters the principal's threats into actor profiles by origin, tracks their
 * escalation (dormant → low → rising → active) and flags harassment campaigns.
 * Derived from the threat feed. Pure and unit-tested.
 */

import type { Case, RiskLevel, Threat, ThreatKind } from "@/lib/types";
import type { NewCaseFields } from "@/lib/agents/recommendation-routing";

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

/** An actor warrants a protective case once it's actively escalating or running harassment. */
export function isCaseWorthy(a: ThreatActor): boolean {
  return a.escalation === "active" || (a.harassment && a.escalation === "rising");
}

const PROTECTIVE_STEPS =
  "Preserve evidence (Evidence Vault), file platform takedowns, brief close protection, and assess a law-enforcement referral.";

/** Build a protective-case title for an actor (stable for dedup). */
export function actorCaseTitle(a: ThreatActor): string {
  return `Threat actor: ${a.label}`;
}

/**
 * Protective cases to open from escalating/harassment actors, de-duplicated
 * within the batch and against existing open case titles.
 */
export function actorCasesToOpen(actors: ThreatActor[], existingOpenTitles: Iterable<string> = []): NewCaseFields[] {
  const seen = new Set<string>(existingOpenTitles);
  const out: NewCaseFields[] = [];
  for (const a of actors) {
    if (!isCaseWorthy(a)) continue;
    const title = actorCaseTitle(a);
    if (seen.has(title)) continue;
    seen.add(title);
    out.push({
      type: "executive_protection",
      title,
      summary: `${a.escalation === "active" ? "Active" : "Rising"} ${a.label.toLowerCase()} targeting the principal: ${a.threatCount} threat(s) (${a.kinds.join(", ")})${a.harassment ? ", harassment campaign" : ""}. Protective steps: ${PROTECTIVE_STEPS}`,
      riskLevel: a.highestRisk,
      assignedAgent: "executive",
    });
  }
  return out;
}

/** Open executive-protection cases (the autonomous loop's output), worst first. */
export function openExecutiveCases(cases: Case[]): Case[] {
  return cases
    .filter((c) => c.type === "executive_protection" && c.status !== "resolved")
    .sort((a, b) => RISK_RANK[b.riskLevel] - RISK_RANK[a.riskLevel] || b.createdAt.localeCompare(a.createdAt));
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
