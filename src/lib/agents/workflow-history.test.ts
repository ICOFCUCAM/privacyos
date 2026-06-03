import { describe, it, expect } from "vitest";
import {
  demoWorkflowHistory, historyStats, toHistoryEntry, OUTCOME_LABEL,
} from "./workflow-history";
import { findTemplate, templateToDefinition } from "./automation-templates";
import { executeWorkflow } from "./workflow-builder";

const T0 = Date.parse("2026-01-01T14:25:00.000Z");

describe("workflow history (Layer 11)", () => {
  it("stores every seeded execution, newest first", () => {
    const h = demoWorkflowHistory(T0);
    expect(h.length).toBeGreaterThanOrEqual(8);
    // newest first
    for (let i = 1; i < h.length; i++) {
      expect(Date.parse(h[i - 1].run.startedAt)).toBeGreaterThanOrEqual(Date.parse(h[i].run.startedAt));
    }
    // deterministic given a fixed clock
    expect(demoWorkflowHistory(T0)[0].run.id).toBe(h[0].run.id);
  });

  it("projects a run into the card fields the spec shows", () => {
    const def = templateToDefinition(findTemplate("breach-response")!);
    // started 14:21, with a duration that lands a few minutes later
    const run = executeWorkflow(def, { risk: "critical" }, Date.parse("2026-01-01T14:21:00.000Z"));
    const e = toHistoryEntry(run, 4492);
    expect(e.number).toBe("#4492");
    expect(e.startedLabel).toBe("14:21");
    expect(e.completedLabel).toMatch(/^14:2/); // a few minutes later
    // agents rendered without the " Agent" suffix
    expect(e.agentLabels).toContain("Threat Intelligence");
    expect(e.agentLabels).toContain("Legal");
    expect(e.agentLabels.every((a) => !/Agent$/.test(a))).toBe(true);
    expect(e.outcomeLabel).toBe("Success");
  });

  it("captures a spread of outcomes (success / awaiting approval / stopped)", () => {
    const h = demoWorkflowHistory(T0);
    const outcomes = new Set(h.map((e) => e.status));
    expect(outcomes.has("success")).toBe(true);
    expect(outcomes.has("paused")).toBe(true); // vendor risk pauses at its gate
    expect(outcomes.has("stopped")).toBe(true); // exec sweep stops below critical
    expect(OUTCOME_LABEL.paused).toBe("Awaiting approval");
  });

  it("summarizes the history", () => {
    const h = demoWorkflowHistory(T0);
    const s = historyStats(h);
    expect(s.total).toBe(h.length);
    expect(s.succeeded + s.awaitingApproval + s.failed).toBe(h.length);
    expect(s.successRate).toBeGreaterThan(0);
    expect(s.avgDurationSec).toBeGreaterThan(0);
    expect(s.agentsEngaged).toBeGreaterThan(1);
  });

  it("handles an empty history", () => {
    expect(historyStats([])).toMatchObject({ total: 0, successRate: 0, avgDurationSec: 0, agentsEngaged: 0 });
  });
});
