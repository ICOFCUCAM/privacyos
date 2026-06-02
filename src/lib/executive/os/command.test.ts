import { describe, it, expect } from "vitest";
import { exposureHeatMap, threatTimeline, exposureGraph } from "./command";
import type { Exposure, Threat } from "@/lib/types";

const exposure = (over: Partial<Exposure> = {}): Exposure => ({
  id: Math.random().toString(36).slice(2), subjectId: "s1", category: "address", source: "data_broker",
  sourceName: "Spokeo", snippet: "", riskLevel: "high", riskScore: 10, status: "monitoring",
  discoveredAt: "2026-01-01T00:00:00Z", lastSeenAt: "2026-01-01T00:00:00Z", ...over,
});
const threat = (over: Partial<Threat> = {}): Threat => ({
  id: Math.random().toString(36).slice(2), subjectId: "s1", kind: "doxxing", title: "Targeting", detail: "",
  riskLevel: "high", source: "dark_web", detectedAt: "2026-01-01T00:00:00Z", acknowledged: false, ...over,
});

describe("executive command center", () => {
  it("builds a heat map across exposure sources", () => {
    const rows = exposureHeatMap([exposure({ source: "data_broker" }), exposure({ source: "dark_web" })]);
    expect(rows.length).toBeGreaterThan(0);
  });

  it("orders the threat timeline and graphs exposure", () => {
    const timeline = threatTimeline([threat({ detectedAt: "2026-01-02T00:00:00Z" }), threat({ detectedAt: "2026-01-01T00:00:00Z" })]);
    expect(timeline.length).toBe(2);
    expect(exposureGraph([exposure(), exposure({ category: "email" })]).length).toBeGreaterThan(0);
  });

  it("handles empty inputs", () => {
    expect(exposureHeatMap([])).toEqual([]);
    expect(threatTimeline([])).toEqual([]);
    expect(exposureGraph([])).toEqual([]);
  });
});
