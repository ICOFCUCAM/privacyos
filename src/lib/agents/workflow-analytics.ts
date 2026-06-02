/**
 * Workflow Analytics (Layer 12).
 *
 * The ROI view over the stored execution history (Layer 11). Turns the run
 * records into the value automation delivered: analyst time saved, cases and
 * actions automated, success rate, agent utilization and risk reduction. Pure
 * and unit-tested — every number is derived from the `WorkflowRun` steps plus a
 * transparent per-step value model, so the analytics always reconcile with the
 * history they summarize.
 */

import type { AgentKind } from "@/lib/types";
import { AGENT_LABEL, ALL_AGENT_KINDS } from "@/lib/billing/entitlements";
import { AUTOMATION_TEMPLATES } from "./automation-templates";
import type { StepType } from "./workflow-builder";
import type { HistoryEntry } from "./workflow-history";

/**
 * Minutes a human analyst would spend doing each step type by hand. Logic and
 * wait blocks cost no analyst time; the action blocks are where labour is saved.
 */
const MANUAL_MINUTES: Record<StepType, number> = {
  agent: 45, case: 25, takedown: 60, report: 40, notify: 5,
  webhook: 10, condition: 0, decision: 0, wait: 0,
};

/** Step types that count as automated "actions" (not logic/human/wait gates). */
const ACTION_TYPES: ReadonlySet<StepType> = new Set<StepType>([
  "agent", "case", "takedown", "report", "notify", "webhook",
]);

/** Fully-loaded analyst cost per hour, for the headline ROI figure (USD). */
const ANALYST_HOURLY_USD = 85;

export interface AgentUtilizationRow {
  agent: AgentKind;
  label: string;
  actions: number;
  /** Share of all automated actions, 0–100. */
  share: number;
}

export interface WorkflowAnalytics {
  totalRuns: number;
  /** Analyst hours saved by automation. */
  timeSavedHours: number;
  /** Estimated labour cost avoided (USD). */
  costSavedUsd: number;
  /** Cases opened automatically across the history. */
  casesAutomated: number;
  /** Action blocks executed across the history. */
  actionsAutomated: number;
  /** Succeeded ÷ total runs, 0–100. */
  successRate: number;
  /** Distinct agents engaged ÷ fleet size, 0–100. */
  agentUtilization: number;
  /** Per-agent action breakdown, busiest first. */
  agentBreakdown: AgentUtilizationRow[];
  /** Estimated risk-score points reduced across successful runs. */
  riskReduction: number;
}

/** Template name → estimated risk-score impact (for the risk-reduction metric). */
const TEMPLATE_IMPACT = new Map<string, number>(
  AUTOMATION_TEMPLATES.map((t) => [t.name, t.impact]),
);

/** Estimate a run's risk reduction: its template's impact, or scaled by actions. */
function runRiskReduction(entry: HistoryEntry, actionsInRun: number): number {
  // Only completed runs reduce risk; a paused/stopped/failed run hasn't yet.
  if (entry.status !== "success") return 0;
  const byTemplate = TEMPLATE_IMPACT.get(entry.name);
  if (byTemplate != null) return byTemplate;
  return Math.min(actionsInRun * 4, 30);
}

export function workflowAnalytics(entries: HistoryEntry[]): WorkflowAnalytics {
  let savedMinutes = 0;
  let casesAutomated = 0;
  let actionsAutomated = 0;
  let succeeded = 0;
  let riskReduction = 0;
  const actionsByAgent = new Map<AgentKind, number>();

  for (const entry of entries) {
    if (entry.status === "success") succeeded += 1;
    let actionsInRun = 0;
    for (const s of entry.run.steps) {
      if (s.outcome !== "run") continue;
      savedMinutes += MANUAL_MINUTES[s.type];
      if (s.type === "case") casesAutomated += 1;
      if (ACTION_TYPES.has(s.type)) {
        actionsAutomated += 1;
        actionsInRun += 1;
      }
    }
    for (const a of entry.run.agentActivity) {
      actionsByAgent.set(a.agent, (actionsByAgent.get(a.agent) ?? 0) + a.actions);
    }
    riskReduction += runRiskReduction(entry, actionsInRun);
  }

  const totalActions = [...actionsByAgent.values()].reduce((s, n) => s + n, 0);
  const agentBreakdown: AgentUtilizationRow[] = [...actionsByAgent.entries()]
    .map(([agent, actions]) => ({
      agent,
      label: AGENT_LABEL[agent],
      actions,
      share: totalActions === 0 ? 0 : Math.round((actions / totalActions) * 100),
    }))
    .sort((a, b) => b.actions - a.actions);

  const timeSavedHours = Math.round(savedMinutes / 60);
  return {
    totalRuns: entries.length,
    timeSavedHours,
    costSavedUsd: timeSavedHours * ANALYST_HOURLY_USD,
    casesAutomated,
    actionsAutomated,
    successRate: entries.length === 0 ? 0 : Math.round((succeeded / entries.length) * 100),
    agentUtilization: Math.round((actionsByAgent.size / ALL_AGENT_KINDS.length) * 100),
    agentBreakdown,
    riskReduction,
  };
}
