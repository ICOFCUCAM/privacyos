import { describe, it, expect } from "vitest";
import { executiveRiskIndices, bandFor, type RiskInput } from "./risk-indices";
import type { Exposure, Threat } from "@/lib/types";

const exposure = (over: Partial<Exposure> = {}): Exposure => ({
  id: Math.random().toString(36).slice(2), subjectId: "s1", category: "address", source: "data_broker",
  sourceName: "Spokeo", snippet: "", riskLevel: "high", riskScore: 10, status: "monitoring",
  discoveredAt: "2026-01-01T00:00:00Z", lastSeenAt: "2026-01-01T00:00:00Z", ...over,
});

const threat = (over: Partial<Threat> = {}): Threat => ({
  id: Math.random().toString(36).slice(2), subjectId: "s1", kind: "doxxing", title: "Address posted", detail: "",
  riskLevel: "critical", source: "dark_web", detectedAt: "2026-01-01T00:00:00Z", acknowledged: false, ...over,
});

const input = (over: Partial<RiskInput> = {}): RiskInput => ({
  exposures: [], threats: [], family: [], travel: [], ...over,
});

describe("executive risk indices", () => {
  it("bandFor uses the canonical risk cut points", () => {
    expect(bandFor(10)).toBe("low");
    expect(bandFor(30)).toBe("elevated");
    expect(bandFor(60)).toBe("high");
    expect(bandFor(80)).toBe("critical");
  });

  it("a clean principal scores near zero / low band", () => {
    const r = executiveRiskIndices(input());
    expect(r.overall).toBeLessThan(25);
    expect(r.band).toBe("low");
    for (const k of ["personal", "family", "physical", "digital", "travel"] as const) {
      expect(r[k]).toBeGreaterThanOrEqual(0);
      expect(r[k]).toBeLessThanOrEqual(100);
    }
  });

  it("physical index rises with address exposure + doxxing", () => {
    const clean = executiveRiskIndices(input());
    const doxxed = executiveRiskIndices(input({
      exposures: [exposure({ category: "address", riskLevel: "critical" }), exposure({ category: "family", riskLevel: "high" })],
      threats: [threat({ kind: "doxxing", riskLevel: "critical" })],
    }));
    expect(doxxed.physical).toBeGreaterThan(clean.physical);
    expect(doxxed.overall).toBeGreaterThan(clean.overall);
  });

  it("acknowledged threats don't raise risk", () => {
    const active = executiveRiskIndices(input({ threats: [threat({ acknowledged: false })] }));
    const acked = executiveRiskIndices(input({ threats: [threat({ acknowledged: true })] }));
    expect(acked.overall).toBeLessThan(active.overall);
  });
});
