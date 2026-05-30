/**
 * Unified operations feed.
 *
 * Merges the platform's real event sources — agent actions, audit log, threats,
 * incidents and removal-workflow transitions — into a single time-ordered stream
 * for the Command Center. Pure and unit-tested; the Overview composes already-
 * fetched data, so the feed honestly reflects whatever is live vs. sample.
 */

import type { RiskLevel, Threat, RemovalRequest } from "@/lib/types";
import type { AgentAction, AuditLogEntry, Incident } from "@/lib/suite-types";

export type EventSeverity = "info" | "low" | "medium" | "high" | "critical";
export type EventKind = "agent" | "audit" | "threat" | "incident" | "removal";

export interface FeedEvent {
  id: string;
  at: string;
  kind: EventKind;
  title: string;
  detail?: string;
  severity: EventSeverity;
  source: string;
}

const RISK_TO_SEVERITY: Record<RiskLevel, EventSeverity> = {
  low: "low",
  medium: "medium",
  high: "high",
  critical: "critical",
};

export interface FeedInputs {
  agentActions?: AgentAction[];
  auditLog?: AuditLogEntry[];
  threats?: Threat[];
  incidents?: Incident[];
  removals?: RemovalRequest[];
}

const titleCase = (s: string) => s.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** Build the merged, newest-first operations feed (capped). */
export function buildFeed(inputs: FeedInputs, limit = 40): FeedEvent[] {
  const events: FeedEvent[] = [];

  for (const a of inputs.agentActions ?? []) {
    events.push({
      id: `agent-${a.id}`,
      at: a.createdAt,
      kind: "agent",
      title: a.summary,
      detail: `${titleCase(a.agent)} agent · ${titleCase(a.kind)}`,
      severity: a.kind === "escalate" ? "high" : "info",
      source: `${titleCase(a.agent)} Agent`,
    });
  }

  for (const e of inputs.auditLog ?? []) {
    events.push({
      id: `audit-${e.id}`,
      at: e.createdAt,
      kind: "audit",
      title: titleCase(e.action),
      detail: e.actor,
      severity: "info",
      source: e.actor.startsWith("agent") ? "Agent" : "User",
    });
  }

  for (const t of inputs.threats ?? []) {
    events.push({
      id: `threat-${t.id}`,
      at: t.detectedAt,
      kind: "threat",
      title: t.title,
      detail: titleCase(t.kind),
      severity: RISK_TO_SEVERITY[t.riskLevel],
      source: "Threat Feed",
    });
  }

  for (const i of inputs.incidents ?? []) {
    events.push({
      id: `incident-${i.id}`,
      at: i.updatedAt || i.detectedAt,
      kind: "incident",
      title: i.title,
      detail: `${titleCase(i.kind)} · ${titleCase(i.status)}`,
      severity: RISK_TO_SEVERITY[i.riskLevel],
      source: "ExecutiveOS",
    });
  }

  for (const r of inputs.removals ?? []) {
    const last = r.history.at(-1);
    if (!last) continue;
    events.push({
      id: `removal-${r.id}`,
      at: last.at,
      kind: "removal",
      title: `${r.brokerName}: ${titleCase(last.status)}`,
      detail: last.note,
      severity: last.status === "reappeared" ? "high" : "low",
      source: "Privacy Agent",
    });
  }

  return events
    .filter((e) => !Number.isNaN(new Date(e.at).getTime()))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit);
}

/** Count of unacknowledged critical/high signals — the "active threats" headline. */
export function activeSeverityCount(events: FeedEvent[]): { critical: number; high: number } {
  return {
    critical: events.filter((e) => e.severity === "critical").length,
    high: events.filter((e) => e.severity === "high").length,
  };
}
