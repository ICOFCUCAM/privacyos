import { describe, it, expect } from "vitest";
import { buildWorkflows, workflowFromRun, workflowMetrics } from "./workflows";
import type { ExecutedStep, PlaybookRun } from "./playbooks";

const step = (over: Partial<ExecutedStep>): ExecutedStep => ({
  kind: "act", label: "x", agent: "privacy", execution: "auto", reason: "", ...over,
});

const run = (over: Partial<PlaybookRun>): PlaybookRun => ({
  playbookId: "broker-removal", playbookName: "Data-Broker Removal", owner: "privacy",
  finding: { id: "f1", title: "Spokeo", riskLevel: "high" },
  steps: [step({}), step({})],
  fullyAutonomous: true, autoSteps: 2, approvalSteps: 0, ...over,
});

describe("workflowFromRun", () => {
  it("marks a fully-autonomous run complete", () => {
    const w = workflowFromRun(run({ fullyAutonomous: true, approvalSteps: 0 }), 0);
    expect(w.status).toBe("complete");
    expect(w.blocked).toBe(false);
    expect(w.stepsDone).toBe(2);
  });

  it("marks a gated escalation step as escalated", () => {
    const w = workflowFromRun(run({
      fullyAutonomous: false, approvalSteps: 1, autoSteps: 2,
      steps: [step({}), step({}), step({ kind: "escalate", execution: "approval", agent: "legal" })],
    }), 0);
    expect(w.status).toBe("escalated");
    expect(w.blocked).toBe(true);
    expect(w.agents).toContain("legal");
  });

  it("marks a non-escalation approval as awaiting_approval", () => {
    const w = workflowFromRun(run({
      fullyAutonomous: false, approvalSteps: 1, autoSteps: 1,
      steps: [step({}), step({ kind: "act", execution: "approval", irreversible: true })],
    }), 0);
    expect(w.status).toBe("awaiting_approval");
  });

  it("collects distinct agents across steps", () => {
    const w = workflowFromRun(run({
      steps: [step({ agent: "discovery" }), step({ agent: "privacy" }), step({ agent: "privacy" })],
    }), 0);
    expect(w.agents.sort()).toEqual(["discovery", "privacy"]);
  });
});

describe("buildWorkflows + metrics", () => {
  it("sorts escalated/awaiting first and computes metrics", () => {
    const runs: PlaybookRun[] = [
      run({ fullyAutonomous: true, approvalSteps: 0 }),
      run({
        fullyAutonomous: false, approvalSteps: 1, autoSteps: 2,
        steps: [step({}), step({}), step({ kind: "escalate", execution: "approval" })],
      }),
    ];
    const wf = buildWorkflows(runs);
    expect(wf[0].status).toBe("escalated"); // sorted to front
    const m = workflowMetrics(wf);
    expect(m.completedToday).toBe(1);
    expect(m.escalated).toBe(1);
    expect(m.active).toBeGreaterThanOrEqual(1);
    expect(m.hoursSaved).toBeGreaterThan(0);
    // Layer-1 dashboard metrics
    expect(m.runsToday).toBe(wf.length);
    expect(m.failedRuns).toBe(1); // escalated
    expect(m.successRate).toBe(50); // 1 complete / (1 complete + 1 failed)
    expect(m.automatedCases).toBe(wf.reduce((s, w) => s + w.casesOpened, 0));
    expect(m.actionsExecuted).toBe(wf.reduce((s, w) => s + w.actionsExecuted, 0));
    expect(m.agentsUtilized).toBeGreaterThan(0);
    expect(m.avgCompletionMin).toBeGreaterThanOrEqual(1);
    // per-run fields populate
    expect(wf[0].durationMin).toBeGreaterThanOrEqual(1);
    expect(wf[0].casesOpened).toBeGreaterThanOrEqual(1);
  });

  it("handles an empty run set", () => {
    const m = workflowMetrics([]);
    expect(m.active).toBe(0);
    expect(m.hoursSaved).toBe(0);
    expect(m.runsToday).toBe(0);
    expect(m.successRate).toBe(100); // nothing failed
    expect(m.avgCompletionMin).toBe(0);
  });
});
