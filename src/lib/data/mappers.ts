/**
 * Row → domain mappers.
 *
 * The Supabase schema is snake_case; the domain model (src/lib/types) is
 * camelCase. These pure functions translate between them so the rest of the
 * codebase never sees database column names. They are unit-tested.
 */

import type {
  AgentKind,
  AgentState,
  Case,
  Exposure,
  Recommendation,
  Subject,
  Threat,
} from "@/lib/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

export function mapSubject(row: any): Subject {
  return {
    id: row.id,
    type: row.type,
    displayName: row.display_name,
    emails: row.emails ?? [],
    phones: row.phones ?? [],
    usernames: row.usernames ?? [],
    organization: row.organization ?? undefined,
    createdAt: row.created_at,
    // Defensive: tolerate the column not existing yet (pre-migration) → autopilot.
    autonomyMode: row.autonomy_mode ?? undefined,
  };
}

export function mapExposure(row: any): Exposure {
  return {
    id: row.id,
    subjectId: row.subject_id,
    category: row.category,
    source: row.source,
    sourceName: row.source_name,
    url: row.url ?? undefined,
    snippet: row.snippet ?? "",
    riskLevel: row.risk_level,
    riskScore: row.risk_score ?? 0,
    status: row.status,
    discoveredAt: row.discovered_at,
    lastSeenAt: row.last_seen_at,
  };
}

export function mapThreat(row: any): Threat {
  return {
    id: row.id,
    subjectId: row.subject_id,
    kind: row.kind,
    title: row.title,
    detail: row.detail ?? "",
    riskLevel: row.risk_level,
    source: row.source,
    detectedAt: row.detected_at,
    acknowledged: row.acknowledged ?? false,
  };
}

export function mapCase(row: any): Case {
  return {
    id: row.id,
    subjectId: row.subject_id,
    type: row.type,
    title: row.title,
    summary: row.summary ?? "",
    status: row.status,
    riskLevel: row.risk_level,
    assignedAgent: row.assigned_agent,
    relatedExposureIds: row.related_exposure_ids ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapRecommendation(row: any): Recommendation {
  return {
    id: row.id,
    subjectId: row.subject_id,
    agent: row.agent,
    title: row.title,
    rationale: row.rationale ?? "",
    riskLevel: row.risk_level,
    impact: row.impact ?? 0,
    actionLabel: row.action_label ?? "Approve",
  };
}

/** Catalog of the agent fleet with human-readable metadata. */
export const AGENT_CATALOG: { kind: AgentKind; name: string; description: string }[] = [
  { kind: "discovery", name: "Discovery Agent", description: "Scans the public internet, brokers and breach feeds." },
  { kind: "privacy", name: "Privacy Agent", description: "Files opt-outs and tracks removals." },
  { kind: "legal", name: "Legal Agent", description: "Drafts GDPR/CCPA requests and complaints." },
  { kind: "reputation", name: "Reputation Agent", description: "Monitors sentiment and search visibility." },
  { kind: "security", name: "Security Agent", description: "Watches breach, dark-web and financial-exposure sources; secures money-bearing accounts." },
  { kind: "deepfake", name: "Deepfake Agent", description: "Detects synthetic media and voice clones." },
  { kind: "executive", name: "Executive Protection Agent", description: "VIP-grade physical & digital protection." },
  { kind: "business", name: "Business Intelligence Agent", description: "Org credential, asset and brand protection." },
  { kind: "orchestrator", name: "Orchestrator Agent", description: "Triages, prioritizes and routes work across the fleet." },
  { kind: "incident", name: "Incident Response Agent", description: "Runs response playbooks; automates safe steps and escalates active fraud & high-risk incidents." },
  { kind: "compliance", name: "Compliance Agent", description: "Monitors SOC 2 control posture and SLA attainment." },
  { kind: "threat_intel", name: "Threat Intelligence Agent", description: "Correlates signals — incl. financial exposure — into emerging-threat narratives." },
  { kind: "vendor", name: "Vendor Risk Agent", description: "Assesses third-party and supply-chain risk." },
];

/**
 * Aggregate `agent_runs` rows into the 8 AgentState cards. Agents with a recent
 * run show as idle with their cumulative item count; agents never run show as
 * idle with zero items.
 */
export function aggregateAgentStates(runRows: any[]): AgentState[] {
  const byKind = new Map<AgentKind, { items: number; lastRunAt?: string }>();
  for (const row of runRows) {
    const cur = byKind.get(row.agent) ?? { items: 0, lastRunAt: undefined };
    cur.items += row.items_handled ?? 0;
    if (!cur.lastRunAt || row.ran_at > cur.lastRunAt) cur.lastRunAt = row.ran_at;
    byKind.set(row.agent, cur);
  }
  return AGENT_CATALOG.map((meta) => {
    const agg = byKind.get(meta.kind);
    return {
      ...meta,
      status: "idle" as const,
      lastRunAt: agg?.lastRunAt,
      itemsHandled: agg?.items ?? 0,
    };
  });
}

export function mapRemoval(row: any): import("@/lib/types").RemovalRequest {
  return {
    id: row.id,
    subjectId: row.subject_id,
    exposureId: row.exposure_id ?? undefined,
    brokerName: row.broker_name,
    status: row.status,
    submittedAt: row.submitted_at,
    nextCheckAt: row.next_check_at ?? undefined,
    history: Array.isArray(row.history) ? row.history : [],
  };
}
