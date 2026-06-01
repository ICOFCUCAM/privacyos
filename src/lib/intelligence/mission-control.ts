/**
 * Mission Control intelligence.
 *
 * Synthesizes the whole operating picture into one posture: fleet readiness,
 * live-workflow load, case/SLA pressure and threat state collapse into a single
 * level (operational / elevated / critical) plus a unified, ranked queue of the
 * items that actually need a human. Pure and unit-tested — derived from already
 * computed domain summaries so it works in live and demo modes.
 */

import type { AgentState, Threat } from "@/lib/types";
import type { WorkflowMetrics, Workflow } from "@/lib/agents/workflows";
import type { CaseQueueSummary, EnrichedCase } from "./case-intel";
import type { ThreatSummary } from "./threat-intel";

export type PostureLevel = "operational" | "elevated" | "critical";

export interface MissionInput {
  riskScore: number;
  agents: AgentState[];
  workflows: WorkflowMetrics;
  cases: CaseQueueSummary;
  threats: ThreatSummary;
  /** Exposures not yet removed/monitoring. */
  unresolvedExposures: number;
  /** Saved automations currently enabled. */
  enabledAutomations: number;
  /** Executive Risk Score, 0–100 (higher = more at risk). */
  executiveRisk: number;
}

export interface OperationalPosture {
  level: PostureLevel;
  headline: string;
  /** What's driving the level, for the cockpit banner. */
  drivers: string[];
  riskScore: number;
  agentsActive: number;
  agentsTotal: number;
  itemsHandled: number;
  executiveRisk: number;
}

const ACTIVE_AGENT_STATUSES = new Set(["running", "blocked"]);

export function computePosture(input: MissionInput): OperationalPosture {
  const { cases, threats, workflows, riskScore, executiveRisk } = input;
  const agentsActive = input.agents.filter((a) => ACTIVE_AGENT_STATUSES.has(a.status)).length;
  const itemsHandled = input.agents.reduce((s, a) => s + a.itemsHandled, 0);

  const criticalDrivers: string[] = [];
  if (cases.critical > 0) criticalDrivers.push(`${cases.critical} critical case${cases.critical === 1 ? "" : "s"} open`);
  if (cases.slaBreached > 0) criticalDrivers.push(`${cases.slaBreached} SLA breach${cases.slaBreached === 1 ? "" : "es"}`);
  if (threats.bySeverity.critical > 0) criticalDrivers.push(`${threats.bySeverity.critical} critical threat${threats.bySeverity.critical === 1 ? "" : "s"}`);
  if (workflows.escalated > 0) criticalDrivers.push(`${workflows.escalated} escalated workflow${workflows.escalated === 1 ? "" : "s"}`);
  if (executiveRisk >= 75) criticalDrivers.push(`Executive risk critical (${executiveRisk})`);

  const elevatedDrivers: string[] = [];
  if (workflows.awaitingApproval > 0) elevatedDrivers.push(`${workflows.awaitingApproval} awaiting approval`);
  if (cases.slaAtRisk > 0) elevatedDrivers.push(`${cases.slaAtRisk} case${cases.slaAtRisk === 1 ? "" : "s"} near SLA`);
  if (threats.active > 0) elevatedDrivers.push(`${threats.active} active threat${threats.active === 1 ? "" : "s"}`);
  if (cases.open > 0) elevatedDrivers.push(`${cases.open} open case${cases.open === 1 ? "" : "s"}`);
  if (executiveRisk >= 50 && executiveRisk < 75) elevatedDrivers.push(`Executive risk elevated (${executiveRisk})`);

  let level: PostureLevel;
  let drivers: string[];
  if (criticalDrivers.length > 0 || riskScore >= 80) {
    level = "critical";
    drivers = criticalDrivers.length > 0 ? criticalDrivers : [`Risk score at ${riskScore}`];
  } else if (elevatedDrivers.length > 0 || riskScore >= 55) {
    level = "elevated";
    drivers = elevatedDrivers.length > 0 ? elevatedDrivers : [`Risk score at ${riskScore}`];
  } else {
    level = "operational";
    drivers = ["No items require attention", `${input.enabledAutomations} automation${input.enabledAutomations === 1 ? "" : "s"} standing guard`];
  }

  const headline = {
    critical: "Critical — human action required now",
    elevated: "Elevated — items in the queue need review",
    operational: "All systems operational — fleet on autopilot",
  }[level];

  return { level, headline, drivers, riskScore, agentsActive, agentsTotal: input.agents.length, itemsHandled, executiveRisk };
}

/* ── Unified priority queue ──────────────────────────────────────────────── */

export type ActionUrgency = "critical" | "high" | "medium";
export type ActionKind = "case" | "workflow" | "threat";

export interface PriorityAction {
  id: string;
  kind: ActionKind;
  urgency: ActionUrgency;
  title: string;
  detail: string;
  href: string;
}

const URGENCY_RANK: Record<ActionUrgency, number> = { critical: 0, high: 1, medium: 2 };

/**
 * One ranked queue of everything needing a human: SLA-breached / escalated /
 * critical cases, blocked workflows, and unacknowledged high-risk threats.
 */
export function buildPriorityQueue(
  cases: EnrichedCase[],
  workflows: Workflow[],
  threats: Threat[],
  limit = 8,
): PriorityAction[] {
  const out: PriorityAction[] = [];

  for (const e of cases) {
    const c = e.case;
    const isCritical = c.riskLevel === "critical" || e.sla === "breached";
    const needs = c.status === "escalated" || e.sla === "breached" || e.sla === "at_risk" || isCritical;
    if (!needs) continue;
    const urgency: ActionUrgency = e.sla === "breached" || isCritical ? "critical" : c.status === "escalated" ? "high" : "medium";
    out.push({
      id: `case-${c.id}`,
      kind: "case",
      urgency,
      title: c.title,
      detail: e.sla === "breached" ? `SLA breached · ${e.ageHours}h open` : c.status === "escalated" ? "Escalated for review" : `Near SLA · ${e.ageHours}/${e.slaHours}h`,
      href: "/dashboard/cases",
    });
  }

  for (const w of workflows) {
    if (!w.blocked) continue;
    out.push({
      id: `wf-${w.id}`,
      kind: "workflow",
      urgency: w.status === "escalated" ? "high" : "medium",
      title: w.name,
      detail: w.status === "escalated" ? "Workflow escalated — approval needed" : "Workflow awaiting approval",
      href: "/dashboard/recommendations",
    });
  }

  for (const t of threats) {
    if (t.acknowledged) continue;
    if (t.riskLevel !== "critical" && t.riskLevel !== "high") continue;
    out.push({
      id: `threat-${t.id}`,
      kind: "threat",
      urgency: t.riskLevel === "critical" ? "critical" : "high",
      title: t.title,
      detail: `${t.riskLevel === "critical" ? "Critical" : "High"} threat · unacknowledged`,
      href: "/dashboard/threats",
    });
  }

  return out
    .sort((a, b) => URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency])
    .slice(0, limit);
}

/** Exposures that haven't reached a resolved state. */
export function countUnresolvedExposures(statuses: string[]): number {
  const resolved = new Set(["removed", "monitoring"]);
  return statuses.filter((s) => !resolved.has(s)).length;
}
