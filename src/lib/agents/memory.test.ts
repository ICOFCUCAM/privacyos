import { describe, it, expect } from "vitest";
import { agentTrackRecord, applyMemory } from "./memory";
import type { AgentKind, Case } from "@/lib/types";
import type { SynthesizedRecommendation } from "./synthesis";

const caseRec = (over: Partial<Case>): Case => ({
  id: Math.random().toString(36).slice(2), subjectId: "s1", type: "breach_response",
  title: "Rotate exposed credentials now", summary: "", status: "in_progress",
  riskLevel: "critical", assignedAgent: "security", relatedExposureIds: [],
  createdAt: "2026-05-30T00:00:00Z", updatedAt: "2026-05-31T00:00:00Z", ...over,
});

const synth = (over: Partial<SynthesizedRecommendation>): SynthesizedRecommendation => ({
  id: Math.random().toString(36).slice(2), subjectId: "s1", agent: "security",
  title: "Rotate exposed credentials now", rationale: "", riskLevel: "critical",
  impact: 18, actionLabel: "Start", corroboratingAgents: ["security"], confidence: 0.9,
  priority: 48.6, mergedCount: 1, ...over,
});

describe("agentTrackRecord", () => {
  it("raises weight with approvals, capped at 1.25", () => {
    const cases = Array.from({ length: 10 }, () => caseRec({ assignedAgent: "security" }));
    const tr = agentTrackRecord(cases);
    expect(tr.get("security")!.approvals).toBe(10);
    expect(tr.get("security")!.weight).toBe(1.25); // capped
  });

  it("gives a modest boost for a couple of approvals", () => {
    const tr = agentTrackRecord([caseRec({ assignedAgent: "reputation" }), caseRec({ assignedAgent: "reputation" })]);
    expect(tr.get("reputation")!.weight).toBeCloseTo(1.1, 5);
  });
});

describe("applyMemory", () => {
  it("suppresses a recommendation whose work is already an open case", () => {
    const plan = [synth({ title: "Rotate exposed credentials now" }), synth({ title: "Launch reputation recovery plan", agent: "reputation" })];
    const cases = [caseRec({ title: "Rotate exposed credentials now", status: "in_progress" })];
    const out = applyMemory(plan, cases);
    expect(out.suppressed).toBe(1);
    expect(out.plan.map((r) => r.title)).not.toContain("Rotate exposed credentials now");
    expect(out.plan).toHaveLength(1);
  });

  it("does NOT suppress when the matching case is resolved", () => {
    const plan = [synth({ title: "Rotate exposed credentials now" })];
    const cases = [caseRec({ title: "Rotate exposed credentials now", status: "resolved" })];
    const out = applyMemory(plan, cases);
    expect(out.suppressed).toBe(0);
    expect(out.plan).toHaveLength(1);
  });

  it("reinforces agents with a track record (higher confidence + priority)", () => {
    const plan = [synth({ agent: "reputation", title: "Launch reputation recovery plan", confidence: 0.7, priority: 20 })];
    // 3 prior approvals for reputation → weight 1.15
    const cases = Array.from({ length: 3 }, () => caseRec({ assignedAgent: "reputation", title: "Past reputation work", status: "resolved" }));
    const out = applyMemory(plan, cases);
    expect(out.reinforcedAgents).toContain("reputation");
    expect(out.plan[0].confidence).toBeGreaterThan(0.7);
    expect(out.plan[0].priority).toBeGreaterThan(20);
  });

  it("leaves untracked agents at neutral weight", () => {
    const plan = [synth({ agent: "deepfake", title: "Open deepfake incident", confidence: 0.75, priority: 30 })];
    const out = applyMemory(plan, []);
    expect(out.reinforcedAgents).toHaveLength(0);
    expect(out.plan[0].confidence).toBe(0.75);
    expect(out.plan[0].priority).toBe(30);
  });

  it("re-sorts by adjusted priority", () => {
    const plan = [
      synth({ agent: "deepfake", title: "A", priority: 30, confidence: 0.8 }),
      synth({ agent: "reputation", title: "B", priority: 28, confidence: 0.7 }),
    ];
    // Heavy reputation track record should lift B above A.
    const cases = Array.from({ length: 5 }, () => caseRec({ assignedAgent: "reputation", title: "x", status: "resolved" }));
    const out = applyMemory(plan, cases);
    expect(out.plan[0].title).toBe("B");
  });
});
