import { describe, it, expect } from "vitest";
import { businessHealth, type HealthInput } from "./health";

const base: HealthInput = {
  nrr: 112,
  netNewMrr: 8000,
  ltvToCac: 4.2,
  paybackMonths: 9,
  detectionAccuracy: 92,
  automationRate: 80,
  compliance: 93,
  enterpriseShare: 60,
};

describe("businessHealth", () => {
  it("returns six equally-weighted dimensions and a 0-100 composite", () => {
    const h = businessHealth(base);
    expect(h.dimensions).toHaveLength(6);
    expect(h.score).toBeGreaterThan(0);
    expect(h.score).toBeLessThanOrEqual(100);
    const avg = Math.round(h.dimensions.reduce((s, d) => s + d.score, 0) / 6);
    expect(h.score).toBe(avg);
  });

  it("grades a strong book an A or B", () => {
    const h = businessHealth(base);
    expect(["A", "B"]).toContain(h.grade);
  });

  it("penalizes negative growth and high churn", () => {
    const weak = businessHealth({
      ...base, nrr: 82, netNewMrr: -3000, ltvToCac: 1.2, paybackMonths: 30,
      detectionAccuracy: 60, automationRate: 40, compliance: 50, enterpriseShare: 5,
    });
    expect(weak.score).toBeLessThan(businessHealth(base).score);
    expect(["C", "D"]).toContain(weak.grade);
  });

  it("clamps sub-scores into 0-100", () => {
    const extreme = businessHealth({
      ...base, nrr: 200, netNewMrr: 1_000_000, ltvToCac: 50, enterpriseShare: 100,
    });
    for (const d of extreme.dimensions) {
      expect(d.score).toBeGreaterThanOrEqual(0);
      expect(d.score).toBeLessThanOrEqual(100);
    }
  });

  it("labels dimensions with human verdicts", () => {
    const h = businessHealth(base);
    const retention = h.dimensions.find((d) => d.key === "retention")!;
    expect(["Excellent", "Healthy", "Watch", "At risk"]).toContain(retention.verdict);
  });
});
