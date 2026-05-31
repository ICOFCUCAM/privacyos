import { describe, it, expect } from "vitest";
import { assessExecutive } from "./executive-protection";
import type { Exposure, Threat } from "@/lib/types";

const threat = (over: Partial<Threat>): Threat => ({
  id: Math.random().toString(36).slice(2), subjectId: "s", kind: "doxxing", title: "T", detail: "",
  riskLevel: "high", source: "social_media", detectedAt: "2026-05-01T00:00:00Z", acknowledged: false, ...over,
});

const exposure = (over: Partial<Exposure>): Exposure => ({
  id: Math.random().toString(36).slice(2), subjectId: "s", category: "address", source: "data_broker",
  sourceName: "Spokeo", snippet: "", riskLevel: "high", riskScore: 20, status: "discovered",
  discoveredAt: "2026-05-01T00:00:00Z", lastSeenAt: "2026-05-01T00:00:00Z", ...over,
});

describe("assessExecutive", () => {
  it("is secure with full score when nothing is active", () => {
    const p = assessExecutive([], []);
    expect(p.protectionScore).toBe(100);
    expect(p.status).toBe("secure");
    expect(p.tier).toBe("Standard");
    expect(p.plan).toHaveLength(0);
    expect(p.domains).toHaveLength(5);
    expect(p.domains.every((d) => d.status === "secure")).toBe(true);
  });

  it("routes threats and address exposures to the right domains", () => {
    const p = assessExecutive(
      [exposure({ category: "address" })],
      [threat({ kind: "location_exposure", riskLevel: "critical" }), threat({ kind: "deepfake", riskLevel: "high" })],
    );
    const physical = p.domains.find((d) => d.domain === "physical")!;
    const impersonation = p.domains.find((d) => d.domain === "impersonation")!;
    const residence = p.domains.find((d) => d.domain === "residence")!;
    expect(physical.signals).toBe(1);
    expect(physical.status).toBe("critical");
    expect(impersonation.status).toBe("action_required");
    expect(residence.signals).toBe(1);
  });

  it("escalates tier to Principal and status to critical on a critical signal", () => {
    const p = assessExecutive([], [threat({ kind: "doxxing", riskLevel: "critical" })]);
    expect(p.tier).toBe("Principal");
    expect(p.status).toBe("critical");
    expect(p.protectionScore).toBeLessThan(100);
    expect(p.plan[0].urgency).toBe("critical");
  });

  it("ignores acknowledged threats", () => {
    const p = assessExecutive([], [threat({ acknowledged: true, riskLevel: "critical" })]);
    expect(p.activeThreats).toBe(0);
    expect(p.physicalSignals).toBe(0);
  });

  it("builds a plan sorted by urgency, one action per affected domain", () => {
    const p = assessExecutive(
      [exposure({ category: "address", riskLevel: "medium" })],
      [threat({ kind: "doxxing", riskLevel: "critical" }), threat({ kind: "negative_press", riskLevel: "medium" })],
    );
    expect(p.plan.length).toBeGreaterThanOrEqual(2);
    expect(p.plan[0].urgency).toBe("critical");
    // urgency is non-decreasing
    const ranks = p.plan.map((a) => ({ critical: 0, high: 1, medium: 2 }[a.urgency]));
    expect(ranks).toEqual([...ranks].sort((x, y) => x - y));
  });
});
