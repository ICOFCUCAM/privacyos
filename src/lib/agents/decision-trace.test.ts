import { describe, it, expect } from "vitest";
import { buildTrace, buildFleetTraces, summarizeTraces, type TraceInput } from "./decision-trace";
import type { Exposure, Recommendation, Threat } from "@/lib/types";

const exposure = (over: Partial<Exposure>): Exposure => ({
  id: Math.random().toString(36).slice(2), subjectId: "s1", category: "credential",
  source: "dark_web", sourceName: "x", snippet: "", riskLevel: "critical", riskScore: 60,
  status: "discovered", discoveredAt: "2026-05-30T00:00:00Z", lastSeenAt: "2026-05-31T00:00:00Z", ...over,
});
const rec = (over: Partial<Recommendation>): Recommendation => ({
  id: "r1", subjectId: "s1", agent: "security", title: "Rotate exposed credentials now",
  rationale: "", riskLevel: "critical", impact: 18, actionLabel: "Start", ...over,
});

const base: TraceInput = { exposures: [], threats: [], recommendations: [] };

describe("buildTrace", () => {
  it("marks an agent with a matching rec as 'action'", () => {
    const t = buildTrace("security", "Security Agent", {
      exposures: [exposure({ category: "credential" })],
      threats: [],
      recommendations: [rec({ agent: "security" })],
    });
    expect(t.verdict).toBe("action");
    expect(t.actions).toContain("Rotate exposed credentials now");
    expect(t.severity).toBe("critical");
    expect(t.reasoning).toMatch(/account-takeover|credential/i);
  });

  it("marks an agent with signals but no rec as 'monitoring'", () => {
    const t = buildTrace("security", "Security Agent", {
      exposures: [exposure({ category: "credential", riskLevel: "medium" })],
      threats: [],
      recommendations: [],
    });
    expect(t.verdict).toBe("monitoring");
    expect(t.signalsConsidered).toBeGreaterThan(0);
    expect(t.actions).toHaveLength(0);
  });

  it("marks an agent with no relevant signals as 'idle'", () => {
    const t = buildTrace("deepfake", "Deepfake Agent", base);
    expect(t.verdict).toBe("idle");
    expect(t.signalsConsidered).toBe(0);
    expect(t.decision).toMatch(/idle/i);
  });

  it("always emits observed + reasoning + decision", () => {
    const t = buildTrace("privacy", "Privacy Agent", base);
    expect(t.observed.length).toBeGreaterThan(0);
    expect(t.reasoning.length).toBeGreaterThan(0);
    expect(t.decision.length).toBeGreaterThan(0);
  });
});

describe("buildFleetTraces + summarize", () => {
  it("produces one trace per fleet agent and a correct summary", () => {
    const input: TraceInput = {
      exposures: [exposure({ category: "credential" }), exposure({ source: "data_broker", category: "address", riskLevel: "high" })],
      threats: [{ id: "t1", subjectId: "s1", kind: "deepfake", title: "x", detail: "", riskLevel: "high", source: "ai_generated", detectedAt: "2026-05-30T00:00:00Z", acknowledged: false } as Threat],
      recommendations: [rec({ agent: "security" })],
    };
    const traces = buildFleetTraces(input);
    expect(traces.length).toBe(13);
    const sum = summarizeTraces(traces);
    expect(sum.acting + sum.monitoring + sum.idle).toBe(13);
    expect(sum.acting).toBeGreaterThanOrEqual(1); // security acted
    expect(sum.totalSignals).toBeGreaterThan(0);
  });
});
