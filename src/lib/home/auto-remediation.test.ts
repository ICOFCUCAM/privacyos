import { describe, it, expect } from "vitest";
import { planAutoRemediation, type AutoRemediationInput } from "./auto-remediation";
import type { Exposure, Recommendation, RemovalRequest } from "@/lib/types";

const rec = (riskLevel: Recommendation["riskLevel"], id = Math.random().toString(36).slice(2)): Recommendation => ({
  id, subjectId: "s1", agent: "privacy", title: `Fix ${id}`, rationale: "", riskLevel, impact: 10, actionLabel: "Approve",
});
const exposure = (over: Partial<Exposure> = {}): Exposure => ({
  id: Math.random().toString(36).slice(2), subjectId: "s1", category: "address", source: "data_broker",
  sourceName: "Spokeo", snippet: "", riskLevel: "medium", riskScore: 10, status: "discovered",
  discoveredAt: "2026-01-01T00:00:00Z", lastSeenAt: "2026-01-01T00:00:00Z", ...over,
});
const base = (over: Partial<AutoRemediationInput> = {}): AutoRemediationInput => ({
  recommendations: [], exposures: [], removals: [], mode: "autopilot", brokerRemovalLimit: Infinity, enabled: true, ...over,
});

describe("planAutoRemediation", () => {
  it("does nothing when disabled or in advisor mode", () => {
    expect(planAutoRemediation(base({ enabled: false, recommendations: [rec("low")] })).actions).toEqual([]);
    expect(planAutoRemediation(base({ mode: "advisor", recommendations: [rec("low")] })).actions).toEqual([]);
  });

  it("autopilot opens cases for below-critical recs but leaves critical for the human", () => {
    const plan = planAutoRemediation(base({
      recommendations: [rec("low", "a"), rec("high", "b"), rec("critical", "c")],
    }));
    const recIds = plan.actions.filter((x) => x.kind === "open_case").map((x) => (x.kind === "open_case" ? x.recId : ""));
    expect(recIds).toContain("a");
    expect(recIds).toContain("b");
    expect(recIds).not.toContain("c"); // critical stays in the human queue
  });

  it("hybrid only auto-handles routine (low/medium), not high", () => {
    const plan = planAutoRemediation(base({ mode: "hybrid", recommendations: [rec("medium", "m"), rec("high", "h")] }));
    const ids = plan.actions.map((x) => (x.kind === "open_case" ? x.recId : ""));
    expect(ids).toContain("m");
    expect(ids).not.toContain("h");
  });

  it("auto-files broker opt-outs for below-floor removable exposures, within allowance", () => {
    const plan = planAutoRemediation(base({
      exposures: [
        exposure({ id: "e1", source: "data_broker", riskLevel: "medium" }),
        exposure({ id: "e2", source: "search_engine", riskLevel: "low" }),
        exposure({ id: "e3", source: "dark_web", riskLevel: "medium" }), // not broker-removable
        exposure({ id: "e4", source: "data_broker", riskLevel: "critical" }), // above floor
      ],
      brokerRemovalLimit: 10,
    }));
    const removed = plan.actions.filter((a) => a.kind === "file_removal").map((a) => (a.kind === "file_removal" ? a.exposureId : ""));
    expect(removed).toEqual(["e1", "e2"]);
  });

  it("respects the remaining allowance and skips already-filed exposures", () => {
    const removals: RemovalRequest[] = [
      { id: "r1", subjectId: "s1", exposureId: "x", brokerName: "B", status: "in_progress", submittedAt: "", history: [] },
    ];
    const plan = planAutoRemediation(base({
      removals, // 1 active → 1 of the limit used
      brokerRemovalLimit: 2,
      exposures: [
        exposure({ id: "x", source: "data_broker" }),        // already filed → skip
        exposure({ id: "y", source: "data_broker" }),        // fits remaining budget (1)
        exposure({ id: "z", source: "data_broker" }),        // over budget → skip
      ],
    }));
    const removed = plan.actions.filter((a) => a.kind === "file_removal").map((a) => (a.kind === "file_removal" ? a.exposureId : ""));
    expect(removed).toEqual(["y"]);
  });
});
