/**
 * Workflow Command Center engine.
 *
 * Turns the playbook runs (matched against live findings) into operational
 * "workflows" with a lifecycle status — the operating layer that connects the
 * agent fleet. Each run becomes a workflow whose status is derived from its
 * steps: Running while steps auto-execute, Awaiting approval when a step is
 * gated, Escalated when an escalation step needs sign-off, Complete when fully
 * autonomous. Pure and unit-tested.
 */

import type { AgentKind } from "@/lib/types";
import type { PlaybookRun } from "./playbooks";

export type WorkflowStatus = "running" | "awaiting_approval" | "escalated" | "complete";

export interface Workflow {
  id: string;
  name: string;
  owner: AgentKind;
  trigger: string;
  status: WorkflowStatus;
  /** Steps completed (auto-executed) out of total. */
  stepsDone: number;
  totalSteps: number;
  /** Agents involved across the workflow's steps. */
  agents: AgentKind[];
  /** Whether a human approval is blocking progress. */
  blocked: boolean;
  /** Run duration in minutes (derived from auto-executed steps). */
  durationMin: number;
  /** Cases this run opened. */
  casesOpened: number;
  /** Actions auto-executed in this run. */
  actionsExecuted: number;
  /** The finding that triggered this workflow — lets the customer resolve it. */
  source?: { id: string; kind: "threat" | "exposure"; label: string };
}

const ESCALATION_KINDS = new Set(["escalate"]);

/** Derive a workflow (with status) from one playbook run. */
export function workflowFromRun(run: PlaybookRun, index: number): Workflow {
  const totalSteps = run.steps.length;
  const stepsDone = run.autoSteps;
  const hasGatedEscalation = run.steps.some((s) => s.execution === "approval" && ESCALATION_KINDS.has(s.kind));
  const status: WorkflowStatus = run.fullyAutonomous
    ? "complete"
    : hasGatedEscalation
      ? "escalated"
      : run.approvalSteps > 0
        ? "awaiting_approval"
        : "running";
  const agents = [...new Set(run.steps.map((s) => s.agent))];
  return {
    id: `${run.playbookId}-${run.finding.id}-${index}`,
    name: run.playbookName,
    owner: run.owner,
    trigger: run.finding.title,
    status,
    stepsDone,
    totalSteps,
    agents,
    blocked: run.approvalSteps > 0,
    durationMin: Math.max(1, Math.round(stepsDone * 0.9)),
    casesOpened: Math.max(1, Math.round(totalSteps / 2)),
    actionsExecuted: stepsDone,
    source: {
      id: run.finding.id,
      kind: run.finding.threatKind ? "threat" : "exposure",
      label: run.finding.title,
    },
  };
}

export function buildWorkflows(runs: PlaybookRun[]): Workflow[] {
  const order: Record<WorkflowStatus, number> = { escalated: 0, awaiting_approval: 1, running: 2, complete: 3 };
  return runs
    .map((r, i) => workflowFromRun(r, i))
    .sort((a, b) => order[a.status] - order[b.status]);
}

export interface WorkflowMetrics {
  active: number;
  awaitingApproval: number;
  escalated: number;
  completedToday: number;
  /** Analyst-hours saved = autonomous steps × minutes/step, annual-free. */
  hoursSaved: number;
  /** Total runs in the window (Workflow Dashboard, Layer 1). */
  runsToday: number;
  /** Cases opened by automation across all runs. */
  automatedCases: number;
  /** Completed ÷ finished (completed + failed), 0–100. */
  successRate: number;
  /** Runs that couldn't auto-complete (escalated for sign-off). */
  failedRuns: number;
  /** Mean run duration, minutes. */
  avgCompletionMin: number;
  /** Auto-executed actions across all runs. */
  actionsExecuted: number;
  /** Distinct agents engaged across all runs. */
  agentsUtilized: number;
}

const MINUTES_PER_STEP = 18;

export function workflowMetrics(workflows: Workflow[]): WorkflowMetrics {
  const autoSteps = workflows.reduce((s, w) => s + w.stepsDone, 0);
  const completedToday = workflows.filter((w) => w.status === "complete").length;
  const failedRuns = workflows.filter((w) => w.status === "escalated").length;
  const finished = completedToday + failedRuns;
  const actionsExecuted = workflows.reduce((s, w) => s + w.actionsExecuted, 0);
  return {
    active: workflows.filter((w) => w.status === "running" || w.status === "awaiting_approval" || w.status === "escalated").length,
    awaitingApproval: workflows.filter((w) => w.status === "awaiting_approval").length,
    escalated: failedRuns,
    completedToday,
    hoursSaved: Math.round((autoSteps * MINUTES_PER_STEP) / 60),
    runsToday: workflows.length,
    automatedCases: workflows.reduce((s, w) => s + w.casesOpened, 0),
    successRate: finished === 0 ? 100 : Math.round((completedToday / finished) * 100),
    failedRuns,
    avgCompletionMin: workflows.length === 0 ? 0 : Math.round(workflows.reduce((s, w) => s + w.durationMin, 0) / workflows.length),
    actionsExecuted,
    agentsUtilized: new Set(workflows.flatMap((w) => w.agents)).size,
  };
}
