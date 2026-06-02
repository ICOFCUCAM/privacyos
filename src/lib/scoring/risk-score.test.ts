import { describe, expect, it } from "vitest";
import { computeRiskScore, exposureWeight, scoreToLevel } from "./risk-score";
import type { Exposure } from "@/lib/types";

function makeExposure(over: Partial<Exposure> = {}): Exposure {
  const now = new Date().toISOString();
  return {
    id: "e1",
    subjectId: "s1",
    category: "email",
    source: "data_broker",
    sourceName: "Spokeo",
    snippet: "test",
    riskLevel: "medium",
    riskScore: 20,
    status: "discovered",
    discoveredAt: now,
    lastSeenAt: now,
    ...over,
  };
}

describe("risk scoring", () => {
  it("returns 0 for no exposures", () => {
    const score = computeRiskScore([]);
    expect(score.overall).toBe(0);
    expect(score.identity).toBe(0);
  });

  it("scores critical exposures higher than low ones", () => {
    const low = computeRiskScore([makeExposure({ riskLevel: "low" })]);
    const critical = computeRiskScore([makeExposure({ riskLevel: "critical" })]);
    expect(critical.overall).toBeGreaterThan(low.overall);
  });

  it("discounts removed exposures heavily", () => {
    const active = exposureWeight(makeExposure({ riskLevel: "high", status: "discovered" }));
    const removed = exposureWeight(makeExposure({ riskLevel: "high", status: "removed" }));
    expect(removed).toBeLessThan(active * 0.2);
  });

  it("drops the overall score monotonically as remediation progresses", () => {
    // The contract the removal→exposure write-back relies on: as the fleet moves
    // an exposure through its remediation lifecycle, the score must fall.
    const at = (status: Exposure["status"]) =>
      computeRiskScore(
        Array.from({ length: 6 }, (_, i) => makeExposure({ id: `e${i}`, riskLevel: "high", status })),
      ).overall;
    expect(at("discovered")).toBeGreaterThan(at("removal_requested"));
    expect(at("removal_requested")).toBeGreaterThan(at("in_progress"));
    expect(at("in_progress")).toBeGreaterThan(at("removed"));
  });

  it("routes credential leaks into the security axis", () => {
    const score = computeRiskScore([
      makeExposure({ category: "credential", riskLevel: "critical" }),
    ]);
    expect(score.security).toBeGreaterThan(score.reputation);
  });

  it("saturates below 100 even with many criticals", () => {
    const many = Array.from({ length: 50 }, (_, i) =>
      makeExposure({ id: `e${i}`, riskLevel: "critical" }),
    );
    const score = computeRiskScore(many);
    expect(score.overall).toBeLessThanOrEqual(100);
    expect(score.overall).toBeGreaterThan(90);
  });

  it("maps scores to bands", () => {
    expect(scoreToLevel(10)).toBe("low");
    expect(scoreToLevel(30)).toBe("medium");
    expect(scoreToLevel(60)).toBe("high");
    expect(scoreToLevel(80)).toBe("critical");
  });
});
