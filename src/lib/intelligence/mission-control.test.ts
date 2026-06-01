import { describe, it, expect } from "vitest";
import {
  buildPriorityQueue, computePosture, countUnresolvedExposures,
  type MissionInput,
} from "./mission-control";
import type { AgentState, Case, Threat } from "@/lib/types";
import type { Workflow } from "@/lib/agents/workflows";
import type { EnrichedCase } from "./case-intel";

const agents = (active: number, total = 5): AgentState[] =>
  Array.from({ length: total }, (_, i) => ({
    kind: "privacy", name: "P", description: "", status: i < active ? "running" : "idle",
    itemsHandled: 3,
  }));

const base: MissionInput = {
  riskScore: 40,
  agents: agents(2),
  workflows: { active: 1, awaitingApproval: 0, escalated: 0, completedToday: 2, hoursSaved: 5, runsToday: 3, automatedCases: 4, successRate: 100, failedRuns: 0, avgCompletionMin: 3, actionsExecuted: 9, agentsUtilized: 4 },
  cases: { open: 0, resolved: 3, critical: 0, resolvedToday: 1, mttrHours: 10, bySeverity: { low: 0, medium: 0, high: 0, critical: 0 }, slaBreached: 0, slaAtRisk: 0, escalated: 0 },
  threats: { active: 0, total: 2, bySeverity: { low: 0, medium: 0, high: 0, critical: 0 }, agentsWorking: 0 },
  unresolvedExposures: 0,
  enabledAutomations: 3,
  executiveRisk: 0,
  attackPaths: 0,
  topAttackScore: 0,
  childSafetyAlerts: 0,
};

describe("computePosture", () => {
  it("is operational when nothing needs attention", () => {
    const p = computePosture(base);
    expect(p.level).toBe("operational");
    expect(p.agentsActive).toBe(2);
    expect(p.agentsTotal).toBe(5);
    expect(p.itemsHandled).toBe(15);
  });

  it("escalates to elevated on open work / active threats", () => {
    const p = computePosture({ ...base, cases: { ...base.cases, open: 2 }, threats: { ...base.threats, active: 1 } });
    expect(p.level).toBe("elevated");
    expect(p.drivers.join(" ")).toMatch(/open case|active threat/);
  });

  it("is critical on SLA breach or critical case/threat", () => {
    expect(computePosture({ ...base, cases: { ...base.cases, slaBreached: 1 } }).level).toBe("critical");
    expect(computePosture({ ...base, threats: { ...base.threats, bySeverity: { low: 0, medium: 0, high: 0, critical: 1 } } }).level).toBe("critical");
    expect(computePosture({ ...base, riskScore: 85 }).level).toBe("critical");
  });

  it("factors the Executive Risk Score into posture + drivers", () => {
    const crit = computePosture({ ...base, executiveRisk: 82 });
    expect(crit.level).toBe("critical");
    expect(crit.drivers.join(" ")).toMatch(/Executive risk critical/);
    expect(crit.executiveRisk).toBe(82);
    const elev = computePosture({ ...base, executiveRisk: 60 });
    expect(elev.level).toBe("elevated");
    expect(elev.drivers.join(" ")).toMatch(/Executive risk elevated/);
  });

  it("factors live attack paths into posture + drivers", () => {
    const crit = computePosture({ ...base, attackPaths: 2, topAttackScore: 82 });
    expect(crit.level).toBe("critical");
    expect(crit.drivers.join(" ")).toMatch(/Live attack path \(score 82\)/);
    expect(crit.attackPaths).toBe(2);
    const elev = computePosture({ ...base, attackPaths: 1, topAttackScore: 55 });
    expect(elev.level).toBe("elevated");
    expect(elev.drivers.join(" ")).toMatch(/1 live attack path/);
  });

  it("raises a child-safety alert into the posture drivers", () => {
    const p = computePosture({ ...base, childSafetyAlerts: 2 });
    expect(p.level).toBe("elevated");
    expect(p.drivers.join(" ")).toMatch(/2 child-safety alerts/);
  });
});

const enriched = (over: Partial<Omit<EnrichedCase, "case">> & { case?: Partial<Case> } = {}): EnrichedCase => {
  const { case: caseOver, ...rest } = over;
  return {
    case: { id: "c1", title: "Breach", status: "open", riskLevel: "high", relatedExposureIds: [], type: "breach_response", assignedAgent: "security", createdAt: "", updatedAt: "", ...caseOver } as Case,
    ageHours: 10, sla: "on_track", slaHours: 24, evidenceCount: 0, priority: 5,
    timeline: [], workflowStage: "Analyze", workflowIndex: 1, ...rest,
  };
};

const wf = (over: Partial<Workflow>): Workflow => ({
  id: "w1", name: "Removal", owner: "privacy", trigger: "x", status: "running",
  stepsDone: 1, totalSteps: 2, agents: ["privacy"], blocked: false,
  durationMin: 1, casesOpened: 1, actionsExecuted: 1, ...over,
});

const threat = (over: Partial<Threat>): Threat => ({
  id: "t1", subjectId: "s", kind: "credential_leak", title: "Leak", detail: "", riskLevel: "high",
  source: "breach_db", detectedAt: "", acknowledged: false, ...over,
});

describe("buildPriorityQueue", () => {
  it("collects, ranks and caps items needing a human", () => {
    const q = buildPriorityQueue(
      [
        enriched({ case: { id: "a", status: "open", riskLevel: "low" }, sla: "on_track" }), // excluded
        enriched({ case: { id: "b", riskLevel: "high", status: "escalated" }, sla: "at_risk" }),
        enriched({ case: { id: "c", riskLevel: "critical" }, sla: "breached" }),
      ],
      [wf({ id: "w", status: "escalated", blocked: true }), wf({ id: "w2", blocked: false })],
      [threat({ id: "t", riskLevel: "critical" }), threat({ id: "t2", riskLevel: "low" }), threat({ id: "t3", acknowledged: true })],
      10,
    );
    const ids = q.map((a) => a.id);
    expect(ids).not.toContain("case-a"); // on-track low case excluded
    expect(ids).not.toContain("wf-w2"); // unblocked excluded
    expect(ids).not.toContain("threat-t2"); // low excluded
    expect(ids).not.toContain("threat-t3"); // acknowledged excluded
    // critical items sort first
    expect(q[0].urgency).toBe("critical");
  });

  it("respects the limit", () => {
    const cases = Array.from({ length: 12 }, (_, i) => enriched({ case: { id: `c${i}`, riskLevel: "critical" }, sla: "breached" }));
    expect(buildPriorityQueue(cases, [], [], 5)).toHaveLength(5);
  });
});

describe("countUnresolvedExposures", () => {
  it("counts everything not removed/monitoring", () => {
    expect(countUnresolvedExposures(["discovered", "removed", "monitoring", "in_progress"])).toBe(2);
  });
});
