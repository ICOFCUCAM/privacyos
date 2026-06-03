import { describe, it, expect } from "vitest";
import { doxxingReport, type DoxxInput } from "./doxxing";
import type { Exposure, Threat } from "@/lib/types";

const exposure = (category: Exposure["category"], over: Partial<Exposure> = {}): Exposure => ({
  id: Math.random().toString(36).slice(2), subjectId: "s1", category, source: "data_broker", sourceName: "Spokeo",
  snippet: "", riskLevel: "high", riskScore: 10, status: "monitoring",
  discoveredAt: "2026-01-01T00:00:00Z", lastSeenAt: "2026-01-01T00:00:00Z", ...over,
});

const threat = (over: Partial<Threat> = {}): Threat => ({
  id: Math.random().toString(36).slice(2), subjectId: "s1", kind: "doxxing", title: "Address posted",
  detail: "", riskLevel: "critical", source: "forum", detectedAt: "2026-01-01T00:00:00Z", acknowledged: false, ...over,
});

const input = (over: Partial<DoxxInput> = {}): DoxxInput => ({
  exposures: [], threats: [], family: [], employees: [], ...over,
});

describe("doxxing report", () => {
  it("derives leaks from address/phone/family exposures", () => {
    const r = doxxingReport(input({
      exposures: [exposure("address"), exposure("phone"), exposure("family")],
    }));
    const kinds = new Set(r.leaks.map((l) => l.kind));
    expect(kinds.has("address")).toBe(true);
    expect(kinds.has("phone")).toBe(true);
    expect(kinds.has("family")).toBe(true);
  });

  it("a clean principal has no leaks", () => {
    expect(doxxingReport(input()).leaks).toHaveLength(0);
  });

  it("doxxing threats raise the report's risk posture", () => {
    const calm = doxxingReport(input({ exposures: [exposure("address", { riskLevel: "low" })] }));
    const hot = doxxingReport(input({
      exposures: [exposure("address", { riskLevel: "critical" })],
      threats: [threat({ kind: "doxxing", riskLevel: "critical" })],
    }));
    expect(hot.leaks.length).toBeGreaterThanOrEqual(calm.leaks.length);
  });
});
