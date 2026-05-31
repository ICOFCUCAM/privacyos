/**
 * Case-management intelligence.
 *
 * Enriches raw cases into the operational view a security case console needs
 * (CrowdStrike / ServiceNow style): a derived lifecycle timeline, SLA/age
 * status, evidence linkage, priority, and queue/severity summaries. Pure and
 * unit-tested — derived from the case + its related exposures, so it works in
 * live and demo modes.
 */

import type { AgentKind, Case, CaseStatus, CaseType, Exposure, RiskLevel } from "@/lib/types";

const RISK_RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };
const DAY = 86_400_000;

/** Target resolution time (hours) by severity — drives SLA status. */
const SLA_HOURS: Record<RiskLevel, number> = { critical: 4, high: 24, medium: 72, low: 168 };

export type SlaStatus = "on_track" | "at_risk" | "breached" | "met";

export interface CaseTimelineStep {
  label: string;
  agent: AgentKind | "system";
  at: string;
  done: boolean;
}

export interface EnrichedCase {
  case: Case;
  /** Hours since the case opened. */
  ageHours: number;
  sla: SlaStatus;
  /** Target resolution hours for this severity. */
  slaHours: number;
  evidenceCount: number;
  /** Priority score = risk-weight × openness × age pressure. */
  priority: number;
  timeline: CaseTimelineStep[];
}

const OPEN_STATUSES: CaseStatus[] = ["open", "in_progress", "awaiting_response", "escalated"];

const TYPE_RESPONDER: Record<CaseType, AgentKind> = {
  data_broker_removal: "privacy",
  reputation_recovery: "reputation",
  deepfake_incident: "deepfake",
  impersonation_takedown: "deepfake",
  breach_response: "security",
  legal_request: "legal",
};

/** Build the lifecycle timeline for a case from its type + status. */
export function caseTimeline(c: Case): CaseTimelineStep[] {
  const responder = c.assignedAgent ?? TYPE_RESPONDER[c.type];
  const order: CaseStatus[] = ["open", "in_progress", "awaiting_response", "escalated", "resolved"];
  const reached = (s: CaseStatus) => order.indexOf(c.status) >= order.indexOf(s) || c.status === "resolved";
  return [
    { label: "Case opened", agent: "system", at: c.createdAt, done: true },
    { label: `Assigned to ${responder} agent`, agent: responder, at: c.createdAt, done: true },
    { label: "Investigation in progress", agent: responder, at: c.updatedAt, done: reached("in_progress") },
    { label: "Awaiting external response", agent: responder, at: c.updatedAt, done: reached("awaiting_response") || c.status === "resolved" },
    { label: c.status === "escalated" ? "Escalated for review" : "Remediation applied", agent: c.status === "escalated" ? "incident" : responder, at: c.updatedAt, done: reached("escalated") || c.status === "resolved" },
    { label: "Resolved & verified", agent: responder, at: c.updatedAt, done: c.status === "resolved" },
  ];
}

export function enrichCase(c: Case, exposures: Exposure[], now = Date.now()): EnrichedCase {
  const ageHours = Math.max(0, Math.round((now - new Date(c.createdAt).getTime()) / 3_600_000));
  const slaHours = SLA_HOURS[c.riskLevel];
  const isOpen = OPEN_STATUSES.includes(c.status);
  let sla: SlaStatus;
  if (!isOpen) sla = "met";
  else if (ageHours >= slaHours) sla = "breached";
  else if (ageHours >= slaHours * 0.66) sla = "at_risk";
  else sla = "on_track";

  const evidenceCount = exposures.filter((e) => c.relatedExposureIds.includes(e.id)).length;
  const openness = isOpen ? 1 : 0.2;
  const agePressure = Math.min(1.5, 1 + ageHours / Math.max(slaHours, 1));
  const priority = Math.round((RISK_RANK[c.riskLevel] + 1) * openness * agePressure * 10) / 10;

  return { case: c, ageHours, sla, slaHours, evidenceCount, priority, timeline: caseTimeline(c) };
}

export interface CaseQueueSummary {
  open: number;
  resolved: number;
  bySeverity: Record<RiskLevel, number>;
  /** Open cases past or near their SLA. */
  slaBreached: number;
  slaAtRisk: number;
  escalated: number;
}

export function summarizeCases(cases: Case[], exposures: Exposure[], now = Date.now()): CaseQueueSummary {
  const enriched = cases.map((c) => enrichCase(c, exposures, now));
  const bySeverity: Record<RiskLevel, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const c of cases) if (OPEN_STATUSES.includes(c.status)) bySeverity[c.riskLevel] += 1;
  return {
    open: cases.filter((c) => OPEN_STATUSES.includes(c.status)).length,
    resolved: cases.filter((c) => c.status === "resolved").length,
    bySeverity,
    slaBreached: enriched.filter((e) => e.sla === "breached").length,
    slaAtRisk: enriched.filter((e) => e.sla === "at_risk").length,
    escalated: cases.filter((c) => c.status === "escalated").length,
  };
}

/** Enrich + sort cases for the console queue: open first, highest priority first. */
export function caseQueue(cases: Case[], exposures: Exposure[], now = Date.now()): EnrichedCase[] {
  return cases
    .map((c) => enrichCase(c, exposures, now))
    .sort((a, b) => {
      const aOpen = OPEN_STATUSES.includes(a.case.status) ? 1 : 0;
      const bOpen = OPEN_STATUSES.includes(b.case.status) ? 1 : 0;
      return bOpen - aOpen || b.priority - a.priority;
    });
}
