import { describe, it, expect } from "vitest";
import {
  CONTROLS, postureByCriterion, readiness, slaReport, type Control,
} from "./posture";

describe("CONTROLS catalog", () => {
  it("covers all five trust service criteria", () => {
    const criteria = new Set(CONTROLS.map((c) => c.criterion));
    expect(criteria).toEqual(new Set(["security", "availability", "confidentiality", "processing_integrity", "privacy"]));
  });

  it("has unique control ids", () => {
    const ids = CONTROLS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("postureByCriterion", () => {
  it("computes weighted coverage per criterion", () => {
    const controls: Control[] = [
      { id: "1", criterion: "security", name: "a", description: "", status: "implemented", evidence: "" },
      { id: "2", criterion: "security", name: "b", description: "", status: "partial", evidence: "" },
    ];
    const posture = postureByCriterion(controls);
    expect(posture).toHaveLength(1);
    expect(posture[0].coverage).toBe(75); // (1 + 0.5) / 2
    expect(posture[0].implemented).toBe(1);
    expect(posture[0].partial).toBe(1);
  });
});

describe("readiness", () => {
  it("blends a readiness score across all controls", () => {
    const r = readiness();
    expect(r.totalControls).toBe(CONTROLS.length);
    expect(r.readiness).toBeGreaterThan(80); // mostly implemented
    expect(r.readiness).toBeLessThanOrEqual(100);
    expect(r.implemented + r.partial + r.planned).toBe(CONTROLS.length);
  });

  it("handles an empty control set", () => {
    expect(readiness([]).readiness).toBe(0);
  });
});

describe("slaReport", () => {
  it("marks targets met when within threshold (direction-aware)", () => {
    const report = slaReport({
      mttdMinutes: 10, // <= 15 target → met
      mttrHours: 6, // > 4 target → missed
      autoRemediationRate: 85, // >= 80 → met
      detectionAccuracy: 92, // >= 90 → met
      uptime: 99.95, // >= 99.9 → met
    });
    const mttd = report.targets.find((t) => t.name === "Mean time to detect")!;
    const mttr = report.targets.find((t) => t.name === "Mean time to respond")!;
    expect(mttd.met).toBe(true);
    expect(mttr.met).toBe(false);
    expect(report.attainment).toBe(80); // 4 of 5 met
  });

  it("reaches full attainment when all targets pass", () => {
    const report = slaReport({
      mttdMinutes: 5, mttrHours: 1, autoRemediationRate: 95, detectionAccuracy: 96, uptime: 100,
    });
    expect(report.attainment).toBe(100);
    expect(report.targets.every((t) => t.met)).toBe(true);
  });
});
