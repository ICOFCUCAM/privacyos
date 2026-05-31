import { describe, it, expect } from "vitest";
import {
  automationMoat, blendedAccuracy, dataCorpus, detectionStats, scoreDetectors,
} from "./moat-metrics";
import type { AgentAction } from "@/lib/suite-types";

describe("detectionStats", () => {
  it("computes precision, recall and F1", () => {
    const s = detectionStats({ detector: "deepfake", truePositives: 90, falsePositives: 10, falseNegatives: 10 });
    expect(s.precision).toBe(90); // 90/100
    expect(s.recall).toBe(90); // 90/100
    expect(s.f1).toBe(90);
  });

  it("handles zero-sample detectors without NaN", () => {
    const s = detectionStats({ detector: "x", truePositives: 0, falsePositives: 0, falseNegatives: 0 });
    expect(s.precision).toBe(0);
    expect(s.recall).toBe(0);
    expect(s.f1).toBe(0);
  });
});

describe("scoreDetectors & blendedAccuracy", () => {
  const samples = [
    { detector: "deepfake", truePositives: 95, falsePositives: 5, falseNegatives: 5 },
    { detector: "impersonation", truePositives: 80, falsePositives: 20, falseNegatives: 10 },
  ];

  it("labels detectors and scores each", () => {
    const scored = scoreDetectors(samples);
    expect(scored[0].label).toBe("Deepfake Detection");
    expect(scored[0].stats.f1).toBeGreaterThan(90);
  });

  it("weights blended accuracy by sample volume", () => {
    const blended = blendedAccuracy(samples);
    expect(blended).toBeGreaterThan(80);
    expect(blended).toBeLessThanOrEqual(100);
    expect(blendedAccuracy([])).toBe(0);
  });
});

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
