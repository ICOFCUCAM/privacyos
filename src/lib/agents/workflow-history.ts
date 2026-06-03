/**
 * Workflow History (Layer 11).
 *
 * Every workflow execution is stored. Layer 10's `executeWorkflow` produces a
 * `WorkflowRun` record (start/end/duration, agent activity, outputs, errors);
 * this layer is the history of those records — the audit trail of what ran,
 * when, with which agents and to what outcome. Pure and unit-tested: the demo
 * history is generated deterministically by executing the template catalog
 * against representative events, so the History view always has content and a
 * live store can drop in behind the same shape.
 */

import type { AgentKind } from "@/lib/types";
import { AGENT_LABEL } from "@/lib/billing/entitlements";
import { findTemplate, templateToDefinition } from "./automation-templates";
import {
  executeWorkflow, type RunStatus, type SampleEvent, type WorkflowRun,
} from "./workflow-builder";

/** Outcome label shown on a history card. */
export const OUTCOME_LABEL: Record<RunStatus, string> = {
  success: "Success",
  paused: "Awaiting approval",
  stopped: "Stopped",
  failed: "Failed",
};

/** A stored run, projected into the fields a history card renders. */
export interface HistoryEntry {
  run: WorkflowRun;
  /** Short numeric reference, e.g. "#4492". */
  number: string;
  /** Workflow name. */
  name: string;
  /** Started time, e.g. "14:21". */
  startedLabel: string;
  /** Completed time, e.g. "14:25". */
  completedLabel: string;
  /** Agent display names (without the " Agent" suffix), in activity order. */
  agentLabels: string[];
  /** Human outcome label. */
  outcomeLabel: string;
  status: RunStatus;
}

/** Strip the trailing " Agent" so chips read "Discovery", "Threat Intelligence". */
function shortAgent(a: AgentKind): string {
  return AGENT_LABEL[a].replace(/ Agent$/, "");
}

function hhmm(iso: string): string {
  const d = new Date(iso);
  const h = String(d.getUTCHours()).padStart(2, "0");
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/** Project a stored run into a history-card entry. */
export function toHistoryEntry(run: WorkflowRun, num: number): HistoryEntry {
  return {
    run,
    number: `#${num}`,
    name: run.workflowName,
    startedLabel: hhmm(run.startedAt),
    completedLabel: hhmm(run.endedAt),
    agentLabels: run.agentActivity.map((a) => shortAgent(a.agent)),
    outcomeLabel: OUTCOME_LABEL[run.status],
    status: run.status,
  };
}

/** Seed of representative executions used to generate the demo history. */
interface HistorySeed {
  num: number;
  templateId: string;
  event: SampleEvent;
  /** Minutes before the anchor `now` that this run started. */
  minutesAgo: number;
}

const HISTORY_SEED: HistorySeed[] = [
  { num: 4492, templateId: "breach-response", event: { risk: "critical" }, minutesAgo: 12 },
  { num: 4491, templateId: "critical-escalation", event: { risk: "critical" }, minutesAgo: 38 },
  { num: 4490, templateId: "vendor-risk-assessment", event: { risk: "high" }, minutesAgo: 64 },
  { num: 4489, templateId: "executive-protection-sweep", event: { risk: "critical" }, minutesAgo: 96 },
  { num: 4488, templateId: "dark-web-monitoring", event: { risk: "high" }, minutesAgo: 142 },
  { num: 4487, templateId: "reputation-recovery", event: { risk: "medium" }, minutesAgo: 190 },
  { num: 4486, templateId: "broker-removal", event: { risk: "medium" }, minutesAgo: 248 },
  { num: 4485, templateId: "executive-protection-sweep", event: { risk: "high" }, minutesAgo: 311 },
];

/**
 * Deterministically generate the stored execution history by running the
 * template catalog against representative events. `now` is injectable so the
 * history is reproducible in tests and demo mode.
 */
export function demoWorkflowHistory(now: number = Date.now()): HistoryEntry[] {
  const entries: HistoryEntry[] = [];
  for (const seed of HISTORY_SEED) {
    const t = findTemplate(seed.templateId);
    if (!t) continue;
    const def = templateToDefinition(t);
    const startedAt = now - seed.minutesAgo * 60_000;
    const run = executeWorkflow(def, seed.event, startedAt);
    entries.push(toHistoryEntry(run, seed.num));
  }
  // Newest first.
  return entries.sort((a, b) => Date.parse(b.run.startedAt) - Date.parse(a.run.startedAt));
}

export interface HistoryStats {
  total: number;
  succeeded: number;
  awaitingApproval: number;
  failed: number;
  /** Succeeded ÷ total, 0–100. */
  successRate: number;
  /** Mean run duration across the history, in seconds. */
  avgDurationSec: number;
  /** Distinct agents engaged across the history. */
  agentsEngaged: number;
}

export function historyStats(entries: HistoryEntry[]): HistoryStats {
  const total = entries.length;
  const succeeded = entries.filter((e) => e.status === "success").length;
  const awaitingApproval = entries.filter((e) => e.status === "paused").length;
  const failed = entries.filter((e) => e.status === "failed" || e.status === "stopped").length;
  const agents = new Set<AgentKind>();
  let durSum = 0;
  for (const e of entries) {
    durSum += e.run.durationSec;
    for (const a of e.run.agentActivity) agents.add(a.agent);
  }
  return {
    total,
    succeeded,
    awaitingApproval,
    failed,
    successRate: total === 0 ? 0 : Math.round((succeeded / total) * 100),
    avgDurationSec: total === 0 ? 0 : Math.round(durSum / total),
    agentsEngaged: agents.size,
  };
}
