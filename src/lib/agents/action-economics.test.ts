import { describe, it, expect } from "vitest";
import { actionEconomics, missionBoard } from "./action-economics";
import type { SynthesizedRecommendation } from "./synthesis";

const synth = (over: Partial<SynthesizedRecommendation>): SynthesizedRecommendation => ({
  id: "r1", subjectId: "s1", agent: "security", title: "Rotate exposed credentials now",
  rationale: "", riskLevel: "critical", impact: 18, actionLabel: "Start",
  corroboratingAgents: ["security"], confidence: 0.9, priority: 48.6, mergedCount: 1, ...over,
});

describe("actionEconomics", () => {
  it("derives effort, success probability and risk reduction", () => {
    const e = actionEconomics(synth({ agent: "security", riskLevel: "critical", impact: 18, confidence: 0.9 }));
    expect(e.effortMinutes).toBeGreaterThan(0);
    expect(e.successProbability).toBe(90); // confidence, no corroboration bonus
    expect(e.riskReduction).toBe(18);
    expect(e.autoExecutable).toBe(true); // security is auto
  });

  it("adds a corroboration bonus to success probability", () => {
    const e = actionEconomics(synth({ confidence: 0.8, corroboratingAgents: ["security", "incident", "threat_intel"] }));
    expect(e.successProbability).toBe(88); // 80 + min(8, 2*4)
  });

  it("flags legal/executive actions as requiring approval (not auto)", () => {
    expect(actionEconomics(synth({ agent: "legal" })).autoExecutable).toBe(false);
    expect(actionEconomics(synth({ agent: "executive" })).autoExecutable).toBe(false);
  });

  it("scales effort by risk level", () => {
    const low = actionEconomics(synth({ agent: "security", riskLevel: "low" })).effortMinutes;
    const crit = actionEconomics(synth({ agent: "security", riskLevel: "critical" })).effortMinutes;
    expect(crit).toBeGreaterThan(low);
  });
});

describe("missionBoard", () => {
  it("computes projected score, total time and mean confidence", () => {
    const board = missionBoard(95, [
      synth({ impact: 18, confidence: 0.9 }),
      synth({ id: "r2", agent: "reputation", impact: 12, confidence: 0.7 }),
    ]);
    expect(board.exposureScore).toBe(95);
    expect(board.projectedScore).toBe(95 - 30);
    expect(board.actionsRequired).toBe(2);
    expect(board.estimatedMinutes).toBeGreaterThan(0);
    expect(board.confidence).toBe(80); // mean of 90 and 70
  });

  it("floors projected score at 0 and handles an empty plan", () => {
    expect(missionBoard(10, [synth({ impact: 50 })]).projectedScore).toBe(0);
    const empty = missionBoard(40, []);
    expect(empty.actionsRequired).toBe(0);
    expect(empty.confidence).toBe(0);
  });
});
