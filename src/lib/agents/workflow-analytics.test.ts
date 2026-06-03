import { describe, it, expect } from "vitest";
import { workflowAnalytics } from "./workflow-analytics";
import { demoWorkflowHistory } from "./workflow-history";

const T0 = Date.parse("2026-01-01T14:25:00.000Z");

describe("workflow analytics (Layer 12) — ROI", () => {
  it("reports the six ROI metrics over the stored history", () => {
    const a = workflowAnalytics(demoWorkflowHistory(T0));
    expect(a.totalRuns).toBeGreaterThanOrEqual(8);
    // Time Saved
    expect(a.timeSavedHours).toBeGreaterThan(0);
    expect(a.costSavedUsd).toBe(a.timeSavedHours * 85);
    // Cases / Actions Automated
    expect(a.casesAutomated).toBeGreaterThan(0);
    expect(a.actionsAutomated).toBeGreaterThanOrEqual(a.casesAutomated);
    // Success Rate
    expect(a.successRate).toBeGreaterThan(0);
    expect(a.successRate).toBeLessThanOrEqual(100);
    // Agent Utilization
    expect(a.agentUtilization).toBeGreaterThan(0);
    expect(a.agentUtilization).toBeLessThanOrEqual(100);
    expect(a.agentBreakdown.length).toBeGreaterThan(1);
    // Risk Reduction
    expect(a.riskReduction).toBeGreaterThan(0);
  });

  it("agent breakdown is busiest-first and shares sum to ~100", () => {
    const a = workflowAnalytics(demoWorkflowHistory(T0));
    for (let i = 1; i < a.agentBreakdown.length; i++) {
      expect(a.agentBreakdown[i - 1].actions).toBeGreaterThanOrEqual(a.agentBreakdown[i].actions);
    }
    const sum = a.agentBreakdown.reduce((s, r) => s + r.share, 0);
    expect(Math.abs(sum - 100)).toBeLessThanOrEqual(a.agentBreakdown.length); // rounding slack
  });

  it("only successful runs reduce risk", () => {
    // A history with no successes should report zero risk reduction.
    const all = demoWorkflowHistory(T0);
    const nonSuccess = all.filter((e) => e.status !== "success");
    expect(nonSuccess.length).toBeGreaterThan(0);
    expect(workflowAnalytics(nonSuccess).riskReduction).toBe(0);
  });

  it("handles an empty history", () => {
    expect(workflowAnalytics([])).toMatchObject({
      totalRuns: 0, timeSavedHours: 0, costSavedUsd: 0, casesAutomated: 0,
      actionsAutomated: 0, successRate: 0, agentUtilization: 0, riskReduction: 0,
    });
  });
});
