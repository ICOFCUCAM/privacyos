import { describe, it, expect } from "vitest";
import { automationMoat, dataCorpus } from "./moat-metrics";
import type { AgentAction } from "@/lib/suite-types";

describe("automationMoat", () => {
  const action = (kind: string): AgentAction => ({
    id: Math.random().toString(36).slice(2),
    agent: "discovery",
    kind: kind as AgentAction["kind"],
    summary: "x",
    status: "completed",
    createdAt: new Date().toISOString(),
  });

  it("computes automation rate excluding human action kinds", () => {
    const actions = [action("scan"), action("scan"), action("remove"), action("escalate")];
    const m = automationMoat(actions, ["escalate"]);
    expect(m.totalActions).toBe(4);
    expect(m.autonomousActions).toBe(3);
    expect(m.humanActions).toBe(1);
    expect(m.automationRate).toBe(75);
    expect(m.hoursSaved).toBeGreaterThan(0);
    expect(m.laborValue).toBeGreaterThan(0);
  });

  it("handles an empty action stream", () => {
    const m = automationMoat([]);
    expect(m.automationRate).toBe(0);
    expect(m.hoursSaved).toBe(0);
  });
});

describe("dataCorpus", () => {
  it("totals records and derives daily velocity", () => {
    const c = dataCorpus({
      exposures: 30, threats: 12, mentions: 40, incidents: 6,
      credentialLeaks: 8, domainRisks: 10, sources: 9, windowDays: 30,
    });
    expect(c.records).toBe(106);
    expect(c.dailyVelocity).toBe(Math.round(106 / 30));
    expect(c.signalTypes).toBe(6);
    expect(c.sources).toBe(9);
  });
});
