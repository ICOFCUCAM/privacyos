import { describe, it, expect } from "vitest";
import { buildProtectionHome, type ProtectionHomeInput } from "./protection-home";
import type { RemovalRequest, Recommendation, Threat, RiskScore } from "@/lib/types";
import type { Workflow } from "@/lib/agents/workflows";

const riskScore = (overall: number, trend: { date: string; overall: number }[] = []): RiskScore => ({
  overall, identity: overall, reputation: overall, financial: overall, security: overall, family: overall, trend,
});

const threat = (over: Partial<Threat> = {}): Threat => ({
  id: Math.random().toString(36).slice(2), subjectId: "s1", kind: "doxxing", title: "Home address exposed",
  detail: "", riskLevel: "high", source: "data_broker", detectedAt: "2026-01-01T00:00:00Z", acknowledged: false, ...over,
});

const rec = (over: Partial<Recommendation> = {}): Recommendation => ({
  id: Math.random().toString(36).slice(2), subjectId: "s1", agent: "privacy", title: "Confirm your home address",
  rationale: "So we can suppress it", riskLevel: "medium", impact: 10, actionLabel: "Confirm", ...over,
});

const removal = (status: RemovalRequest["status"]): RemovalRequest => ({
  id: Math.random().toString(36).slice(2), subjectId: "s1", brokerName: "Spokeo", status,
  submittedAt: "2026-01-01T00:00:00Z", history: [],
});

const wf = (over: Partial<Workflow> = {}): Workflow => ({
  id: Math.random().toString(36).slice(2), name: "Breach response", owner: "security", trigger: "x",
  status: "running", stepsDone: 2, totalSteps: 3, agents: ["security"], blocked: false,
  durationMin: 5, casesOpened: 1, actionsExecuted: 2, ...over,
});

const base = (over: Partial<ProtectionHomeInput> = {}): ProtectionHomeInput => ({
  riskScore: riskScore(40),
  exposures: { length: 12 },
  threats: [threat()],
  recommendations: [rec()],
  removals: [removal("in_progress"), removal("removed")],
  workflows: [wf()],
  ...over,
});

describe("Protection Home (autonomous view model)", () => {
  it("turns risk into a protection score + band + human headline", () => {
    const h = buildProtectionHome(base({ riskScore: riskScore(40) }));
    expect(h.protectionScore).toBe(60); // 100 − 40
    expect(h.band).toBe("fair");
    expect(h.headline).toMatch(/getting safer|working through/i);
  });

  it("bands map across the range", () => {
    expect(buildProtectionHome(base({ riskScore: riskScore(5) })).band).toBe("secure");
    expect(buildProtectionHome(base({ riskScore: riskScore(20) })).band).toBe("protected");
    expect(buildProtectionHome(base({ riskScore: riskScore(40) })).band).toBe("fair");
    expect(buildProtectionHome(base({ riskScore: riskScore(70) })).band).toBe("exposed");
  });

  it("composes the autonomous 'doing' list from removals, workflows, reputation + monitoring", () => {
    const h = buildProtectionHome(base({
      removals: [removal("in_progress"), removal("removal_requested")],
      workflows: [wf({ status: "running" }), wf({ status: "complete" })],
      threats: [threat({ kind: "negative_press" })],
    }));
    const kinds = h.doing.map((d) => d.kind);
    expect(kinds).toContain("removal");
    expect(kinds).toContain("workflow");
    expect(kinds).toContain("reputation");
    expect(kinds).toContain("monitoring"); // always-on baseline
    expect(h.doing.find((d) => d.kind === "removal")!.label).toMatch(/Removing 2 listings/);
  });

  it("surfaces only the human queue — blocked workflows + top recommendations, highest-risk first", () => {
    const h = buildProtectionHome(base({
      workflows: [wf({ status: "escalated", name: "Critical escalation" })],
      recommendations: [
        rec({ riskLevel: "low", title: "Low item" }),
        rec({ riskLevel: "critical", title: "Critical item" }),
      ],
    }));
    expect(h.needsYou.length).toBeGreaterThan(0);
    expect(h.needsYou.length).toBeLessThanOrEqual(4);
    // highest risk first
    expect(h.needsYou[0].riskLevel).toBe("critical");
    expect(h.needsYou.some((n) => /Approve: Critical escalation/.test(n.title))).toBe(true);
  });

  it("summarizes the exposure mirror", () => {
    const h = buildProtectionHome(base({
      exposures: { length: 12 },
      threats: [threat({ acknowledged: false, riskLevel: "critical", title: "Leaked SSN" }), threat({ acknowledged: true })],
      removals: [removal("in_progress"), removal("removed"), removal("removed")],
    }));
    expect(h.found.exposures).toBe(12);
    expect(h.found.threats).toBe(1); // acknowledged excluded
    expect(h.found.total).toBe(13);
    expect(h.found.removalsInFlight).toBe(1);
    expect(h.found.removed).toBe(2);
    expect(h.found.topConcern).toBe("Leaked SSN"); // worst active threat
  });

  it("derives a protection trend (higher = better) and delta", () => {
    const h = buildProtectionHome(base({
      riskScore: riskScore(30, [
        { date: "2026-01-01", overall: 50 },
        { date: "2026-01-08", overall: 30 },
      ]),
    }));
    expect(h.trend.map((t) => t.score)).toEqual([50, 70]); // inverted
    expect(h.delta).toBe(20); // improved
  });
});
