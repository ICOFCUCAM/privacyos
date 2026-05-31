import { describe, it, expect } from "vitest";
import {
  caseAgentActivity, caseQueue, caseTimeline, enrichCase, filterCases, summarizeCases, WORKFLOW_STAGES,
} from "./case-intel";
import type { Case, Exposure } from "@/lib/types";

const NOW = new Date("2026-05-31T12:00:00Z").getTime();
const hoursAgo = (h: number) => new Date(NOW - h * 3_600_000).toISOString();

const caseRec = (over: Partial<Case>): Case => ({
  id: Math.random().toString(36).slice(2), subjectId: "s1", type: "breach_response",
  title: "Credential breach", summary: "", status: "in_progress", riskLevel: "critical",
  assignedAgent: "security", relatedExposureIds: [], createdAt: hoursAgo(1), updatedAt: hoursAgo(0), ...over,
});

const exposure = (id: string): Exposure => ({
  id, subjectId: "s1", category: "credential", source: "breach_db", sourceName: "x", snippet: "",
  riskLevel: "critical", riskScore: 60, status: "discovered", discoveredAt: hoursAgo(2), lastSeenAt: hoursAgo(0),
});

describe("enrichCase SLA", () => {
  it("is on_track when fresh, at_risk near the SLA, breached past it", () => {
    expect(enrichCase(caseRec({ riskLevel: "critical", createdAt: hoursAgo(1) }), [], NOW).sla).toBe("on_track"); // 1h < 4h
    expect(enrichCase(caseRec({ riskLevel: "critical", createdAt: hoursAgo(3) }), [], NOW).sla).toBe("at_risk"); // 3h >= 2.64
    expect(enrichCase(caseRec({ riskLevel: "critical", createdAt: hoursAgo(6) }), [], NOW).sla).toBe("breached"); // 6h >= 4h
  });

  it("is met once the case is resolved", () => {
    expect(enrichCase(caseRec({ status: "resolved", createdAt: hoursAgo(100) }), [], NOW).sla).toBe("met");
  });

  it("counts linked evidence", () => {
    const c = caseRec({ relatedExposureIds: ["e1", "e2"] });
    const e = enrichCase(c, [exposure("e1"), exposure("e2"), exposure("e3")], NOW);
    expect(e.evidenceCount).toBe(2);
  });
});

describe("caseTimeline", () => {
  it("marks reached lifecycle steps done", () => {
    const tl = caseTimeline(caseRec({ status: "resolved" }));
    expect(tl.every((s) => s.done)).toBe(true);
    expect(tl[0].label).toBe("Case opened");
  });
  it("leaves later steps undone for an open case", () => {
    const tl = caseTimeline(caseRec({ status: "open" }));
    expect(tl[0].done).toBe(true);
    expect(tl.at(-1)!.done).toBe(false); // not resolved
  });
});

describe("summarizeCases", () => {
  it("counts open/resolved, severity, breaches and escalations", () => {
    const s = summarizeCases([
      caseRec({ status: "in_progress", riskLevel: "critical", createdAt: hoursAgo(6) }), // breached
      caseRec({ status: "escalated", riskLevel: "high" }),
      caseRec({ status: "resolved", riskLevel: "medium" }),
    ], [], NOW);
    expect(s.open).toBe(2);
    expect(s.resolved).toBe(1);
    expect(s.escalated).toBe(1);
    expect(s.slaBreached).toBeGreaterThanOrEqual(1);
    expect(s.bySeverity.critical).toBe(1);
  });
});

describe("caseQueue", () => {
  it("puts open cases ahead of resolved, highest priority first", () => {
    const q = caseQueue([
      caseRec({ status: "resolved", riskLevel: "critical" }),
      caseRec({ status: "in_progress", riskLevel: "low" }),
      caseRec({ status: "open", riskLevel: "critical", createdAt: hoursAgo(10) }),
    ], [], NOW);
    expect(["open", "in_progress"]).toContain(q[0].case.status);
    expect(q.at(-1)!.case.status).toBe("resolved");
  });
});

describe("MTTR + resolved-today + critical metrics", () => {
  it("computes mean resolution time and resolved-today", () => {
    const s = summarizeCases([
      caseRec({ status: "resolved", createdAt: hoursAgo(10), updatedAt: hoursAgo(4) }), // 6h
      caseRec({ status: "resolved", createdAt: hoursAgo(12), updatedAt: hoursAgo(2) }), // 10h
      caseRec({ status: "open", riskLevel: "critical" }),
    ], [], NOW);
    expect(s.mttrHours).toBe(8); // mean of 6 and 10
    expect(s.resolvedToday).toBe(2);
    expect(s.critical).toBe(1);
  });
});

describe("workflow stage", () => {
  it("maps status to an 8-stage workflow position", () => {
    expect(WORKFLOW_STAGES).toHaveLength(8);
    expect(enrichCase(caseRec({ status: "resolved" }), [], NOW).workflowStage).toBe("Close");
    expect(enrichCase(caseRec({ status: "in_progress" }), [], NOW).workflowStage).toBe("Execute");
    expect(enrichCase(caseRec({ status: "escalated" }), [], NOW).workflowIndex).toBe(3);
  });
});

describe("filterCases", () => {
  const items = caseQueue([
    caseRec({ status: "open", riskLevel: "critical" }),
    caseRec({ status: "escalated", riskLevel: "high" }),
    caseRec({ status: "resolved", riskLevel: "low" }),
  ], [], NOW);
  it("filters by status and severity", () => {
    expect(filterCases(items, "all")).toHaveLength(3);
    expect(filterCases(items, "open").length).toBe(2); // open + escalated are open
    expect(filterCases(items, "escalated")).toHaveLength(1);
    expect(filterCases(items, "resolved")).toHaveLength(1);
    expect(filterCases(items, "critical")).toHaveLength(1);
  });
});

describe("caseAgentActivity", () => {
  it("lists distinct agents that worked the case", () => {
    const acts = caseAgentActivity(caseRec({ status: "resolved", assignedAgent: "security" }));
    expect(acts.length).toBeGreaterThan(0);
    expect(acts.some((a) => a.agent === "security")).toBe(true);
    // no duplicate agents
    expect(new Set(acts.map((a) => a.agent)).size).toBe(acts.length);
  });
});
