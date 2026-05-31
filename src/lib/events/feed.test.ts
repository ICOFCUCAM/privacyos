import { describe, expect, it } from "vitest";
import { activeSeverityCount, buildFeed } from "./feed";
import type { Threat, RemovalRequest } from "@/lib/types";
import type { AgentAction, AuditLogEntry, Incident } from "@/lib/suite-types";

const threats: Threat[] = [
  { id: "t1", subjectId: "s", kind: "credential_leak", title: "Leak", detail: "", riskLevel: "critical", source: "dark_web", detectedAt: "2026-01-05T00:00:00Z", acknowledged: false },
];
const agentActions: AgentAction[] = [
  { id: "a1", agent: "security", kind: "escalate", summary: "Escalated leak", status: "completed", createdAt: "2026-01-06T00:00:00Z" },
  { id: "a2", agent: "discovery", kind: "scan", summary: "Swept sources", status: "completed", createdAt: "2026-01-01T00:00:00Z" },
];
const auditLog: AuditLogEntry[] = [
  { id: "au1", actor: "user", action: "removal.filed", metadata: {}, createdAt: "2026-01-04T00:00:00Z" },
];
const incidents: Incident[] = [
  { id: "i1", subjectId: "s", kind: "deepfake", title: "Synthetic image", detail: "", riskLevel: "high", status: "open", evidenceCount: 1, detectedAt: "2026-01-02T00:00:00Z", updatedAt: "2026-01-03T00:00:00Z" },
];
const removals: RemovalRequest[] = [
  { id: "r1", subjectId: "s", brokerName: "Spokeo", status: "reappeared", submittedAt: "2026-01-01T00:00:00Z", history: [{ at: "2026-01-07T00:00:00Z", status: "reappeared", note: "Re-filing" }] },
];

describe("operations feed", () => {
  it("merges all sources newest-first", () => {
    const feed = buildFeed({ threats, agentActions, auditLog, incidents, removals });
    expect(feed).toHaveLength(6);
    expect(feed[0].id).toBe("removal-r1"); // 01-07 newest
    expect(feed[feed.length - 1].id).toBe("agent-a2"); // 01-01 oldest
  });

  it("maps risk levels and escalations to severity", () => {
    const feed = buildFeed({ threats, agentActions });
    expect(feed.find((e) => e.id === "threat-t1")!.severity).toBe("critical");
    expect(feed.find((e) => e.id === "agent-a1")!.severity).toBe("high");
    expect(feed.find((e) => e.id === "agent-a2")!.severity).toBe("info");
  });

  it("respects the limit", () => {
    expect(buildFeed({ threats, agentActions, auditLog, incidents, removals }, 2)).toHaveLength(2);
  });

  it("counts active high/critical signals", () => {
    const feed = buildFeed({ threats, agentActions, incidents, removals });
    const counts = activeSeverityCount(feed);
    expect(counts.critical).toBe(1);
    expect(counts.high).toBeGreaterThanOrEqual(2);
  });

  it("skips removals without history and bad dates", () => {
    const feed = buildFeed({ removals: [{ ...removals[0], history: [] }] });
    expect(feed).toHaveLength(0);
  });

  it("surfaces playbook runs with autonomy-aware severity", () => {
    const feed = buildFeed({
      playbookRuns: [
        { id: "p1", at: "2026-01-08T00:00:00Z", playbookName: "Broker Removal", owner: "privacy", fullyAutonomous: true, autoSteps: 4, approvalSteps: 0, level: "medium" },
        { id: "p2", at: "2026-01-08T00:00:00Z", playbookName: "Deepfake Takedown", owner: "deepfake", fullyAutonomous: false, autoSteps: 2, approvalSteps: 1, level: "critical" },
      ],
    });
    const auto = feed.find((e) => e.id === "playbook-p1")!;
    const gated = feed.find((e) => e.id === "playbook-p2")!;
    expect(auto.kind).toBe("playbook");
    expect(auto.severity).toBe("low"); // fully autonomous → low/positive
    expect(auto.title).toContain("autonomously");
    expect(gated.severity).toBe("critical"); // gated → inherits finding severity
    expect(gated.title).toContain("approval pending");
  });
});
