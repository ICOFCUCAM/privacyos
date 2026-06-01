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
  /** Current stage in the 8-stage operational workflow. */
  workflowStage: WorkflowStage;
  workflowIndex: number;
}

/** The operational workflow every case advances through. */
export const WORKFLOW_STAGES = [
  "Detect", "Analyze", "Correlate", "Decide", "Execute", "Verify", "Report", "Close",
] as const;
export type WorkflowStage = (typeof WORKFLOW_STAGES)[number];

/** Map a case status to its current workflow stage index (0–7). */
function stageIndexFor(status: CaseStatus): number {
  switch (status) {
    case "open": return 1;            // Detected → analyzing
    case "in_progress": return 4;     // Executing
    case "awaiting_response": return 5; // Verifying
    case "escalated": return 3;       // Decide (held for human)
    case "resolved": return 7;        // Close
    default: return 0;
  }
}

const OPEN_STATUSES: CaseStatus[] = ["open", "in_progress", "awaiting_response", "escalated"];

const TYPE_RESPONDER: Record<CaseType, AgentKind> = {
  data_broker_removal: "privacy",
  reputation_recovery: "reputation",
  deepfake_incident: "deepfake",
  impersonation_takedown: "deepfake",
  breach_response: "security",
  executive_protection: "executive",
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
  const workflowIndex = stageIndexFor(c.status);

  return {
    case: c, ageHours, sla, slaHours, evidenceCount, priority, timeline: caseTimeline(c),
    workflowStage: WORKFLOW_STAGES[workflowIndex], workflowIndex,
  };
}

export interface CaseQueueSummary {
  open: number;
  resolved: number;
  /** Open critical-severity cases. */
  critical: number;
  /** Cases resolved within the last 24h. */
  resolvedToday: number;
  /** Mean resolution time across resolved cases, hours (0 if none). */
  mttrHours: number;
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
  const resolved = cases.filter((c) => c.status === "resolved");
  const resolvedToday = resolved.filter((c) => now - new Date(c.updatedAt).getTime() <= DAY).length;
  const resolutionHrs = resolved.map((c) => Math.max(0, (new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime()) / 3_600_000));
  const mttrHours = resolutionHrs.length === 0 ? 0 : Math.round((resolutionHrs.reduce((s, h) => s + h, 0) / resolutionHrs.length) * 10) / 10;
  return {
    open: cases.filter((c) => OPEN_STATUSES.includes(c.status)).length,
    resolved: resolved.length,
    critical: cases.filter((c) => OPEN_STATUSES.includes(c.status) && c.riskLevel === "critical").length,
    resolvedToday,
    mttrHours,
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

/* ── Filtering ───────────────────────────────────────────────────────────── */

export type CaseFilter =
  | "all" | "open" | "escalated" | "resolved"
  | RiskLevel;

export function filterCases(items: EnrichedCase[], filter: CaseFilter): EnrichedCase[] {
  switch (filter) {
    case "all": return items;
    case "open": return items.filter((e) => OPEN_STATUSES.includes(e.case.status));
    case "escalated": return items.filter((e) => e.case.status === "escalated");
    case "resolved": return items.filter((e) => e.case.status === "resolved");
    case "low": case "medium": case "high": case "critical":
      return items.filter((e) => e.case.riskLevel === filter);
    default: return items;
  }
}

/* ── Agent activity ──────────────────────────────────────────────────────── */

export interface CaseAgentActivity {
  agent: AgentKind;
  action: string;
}

/** The agents that have worked a case + what each did, from its timeline. */
export function caseAgentActivity(c: Case): CaseAgentActivity[] {
  const seen = new Set<AgentKind>();
  const out: CaseAgentActivity[] = [];
  for (const step of caseTimeline(c)) {
    if (!step.done || step.agent === "system") continue;
    if (seen.has(step.agent)) continue;
    seen.add(step.agent);
    out.push({ agent: step.agent, action: step.label });
  }
  return out;
}
