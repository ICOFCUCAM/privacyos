import { describe, it, expect } from "vitest";
import {
  agentRoster,
  attackSurface,
  bucketByDay,
  discoveryVelocity,
  exposureTimeline,
  onlineAgentCount,
  remediationProgress,
  topExposureSources,
} from "./command-center";
import type { AgentState, Exposure, RemovalRequest, RiskLevel } from "@/lib/types";
import type { AgentAction } from "@/lib/suite-types";

const NOW = new Date("2025-05-31T12:00:00.000Z").getTime();
const ago = (days: number) => new Date(NOW - days * 86_400_000).toISOString();

function exposure(over: Partial<Exposure>): Exposure {
  return {
    id: Math.random().toString(36).slice(2),
    subjectId: "s1",
    category: "name",
    source: "data_broker",
    sourceName: "Test",
    snippet: "",
    riskLevel: "medium",
    riskScore: 20,
    status: "discovered",
    discoveredAt: ago(1),
    lastSeenAt: ago(0),
    ...over,
  };
}

describe("bucketByDay", () => {
  it("returns exactly `days` buckets ending today", () => {
    const buckets = bucketByDay<{ d: string; l: RiskLevel }>(
      [],
      (x) => x.d,
      (x) => x.l,
      14,
      NOW,
    );
    expect(buckets).toHaveLength(14);
    expect(buckets[13].date).toBe(new Date(NOW).toISOString().slice(0, 10));
  });

  it("buckets items into the right day and severity", () => {
    const items = [
      { d: ago(0), l: "critical" as RiskLevel },
      { d: ago(0), l: "low" as RiskLevel },
      { d: ago(2), l: "high" as RiskLevel },
    ];
    const buckets = bucketByDay(items, (x) => x.d, (x) => x.l, 7, NOW);
    const today = buckets[6];
    expect(today.total).toBe(2);
    expect(today.byLevel.critical).toBe(1);
    expect(today.byLevel.low).toBe(1);
    expect(buckets[4].total).toBe(1);
    expect(buckets[4].byLevel.high).toBe(1);
  });

  it("ignores items outside the window", () => {
    const items = [{ d: ago(40), l: "high" as RiskLevel }];
    const buckets = bucketByDay(items, (x) => x.d, (x) => x.l, 30, NOW);
    expect(buckets.reduce((s, b) => s + b.total, 0)).toBe(0);
  });
});

describe("exposureTimeline", () => {
  it("classifies exposures by discovery date", () => {
    const exps = [exposure({ discoveredAt: ago(0), riskLevel: "critical" }), exposure({ discoveredAt: ago(0) })];
    const tl = exposureTimeline(exps, 30, NOW);
    expect(tl[29].total).toBe(2);
    expect(tl[29].byLevel.critical).toBe(1);
  });
});

describe("discoveryVelocity", () => {
  it("computes last7 / prev7 and a positive delta", () => {
    const exps = [
      exposure({ discoveredAt: ago(1) }),
      exposure({ discoveredAt: ago(2) }),
      exposure({ discoveredAt: ago(3) }),
      exposure({ discoveredAt: ago(9) }), // prev7
    ];
    const v = discoveryVelocity(exps, [], 30, NOW);
    expect(v.last7).toBe(3);
    expect(v.prev7).toBe(1);
    expect(v.deltaPct).toBe(200);
    expect(v.perDay).toHaveLength(30);
    expect(v.windowTotal).toBe(4);
  });

  it("returns 0 delta when there is no prior-week baseline", () => {
    const v = discoveryVelocity([exposure({ discoveredAt: ago(1) })], [], 30, NOW);
    expect(v.prev7).toBe(0);
    expect(v.deltaPct).toBe(0);
  });
});

describe("remediationProgress", () => {
  const removal = (status: RemovalRequest["status"]): RemovalRequest => ({
    id: Math.random().toString(36).slice(2),
    subjectId: "s1",
    brokerName: "Spokeo",
    status,
    submittedAt: ago(5),
    history: [],
  });

  it("computes neutralized percentage and stages", () => {
    const p = remediationProgress([
      removal("removed"),
      removal("monitoring"),
      removal("in_progress"),
      removal("reappeared"),
    ]);
    expect(p.total).toBe(4);
    expect(p.removed).toBe(1);
    expect(p.monitoring).toBe(1);
    expect(p.inProgress).toBe(1);
    expect(p.reappeared).toBe(1);
    expect(p.percentComplete).toBe(50); // (removed+monitoring)/total
    expect(p.stages).toHaveLength(4);
  });

  it("handles an empty portfolio without dividing by zero", () => {
    const p = remediationProgress([]);
    expect(p.percentComplete).toBe(0);
    expect(p.total).toBe(0);
  });
});

describe("topExposureSources", () => {
  it("ranks sources by count with percentages and dominant severity", () => {
    const exps = [
      exposure({ source: "data_broker", riskLevel: "high" }),
      exposure({ source: "data_broker", riskLevel: "critical" }),
      exposure({ source: "dark_web", riskLevel: "low" }),
    ];
    const ranked = topExposureSources(exps);
    expect(ranked[0].source).toBe("data_broker");
    expect(ranked[0].count).toBe(2);
    expect(ranked[0].percent).toBe(67);
    expect(ranked[0].topLevel).toBe("critical");
    expect(ranked[0].label).toBe("Data Brokers");
  });
});

describe("attackSurface", () => {
  it("always returns all axes, zero-filled", () => {
    const surface = attackSurface([]);
    expect(surface).toHaveLength(8);
    expect(surface.every((a) => a.count === 0)).toBe(true);
  });

  it("maps categories onto the correct axes with weights", () => {
    const surface = attackSurface([
      exposure({ category: "credential", riskScore: 60 }),
      exposure({ category: "address", riskScore: 30 }),
    ]);
    const creds = surface.find((a) => a.label === "Credentials")!;
    const loc = surface.find((a) => a.label === "Location")!;
    expect(creds.count).toBe(1);
    expect(creds.weight).toBe(60);
    expect(loc.count).toBe(1);
  });
});

describe("agentRoster", () => {
  const agent = (over: Partial<AgentState>): AgentState => ({
    kind: "discovery",
    name: "Discovery Agent",
    description: "Scans.",
    status: "running",
    itemsHandled: 10,
    ...over,
  });
  const action = (over: Partial<AgentAction>): AgentAction => ({
    id: Math.random().toString(36).slice(2),
    agent: "discovery",
    kind: "scan",
    summary: "Swept layers.",
    status: "completed",
    createdAt: ago(0),
    ...over,
  });

  it("fuses the latest action into a current task", () => {
    const roster = agentRoster(
      [agent({})],
      [action({ summary: "Old", createdAt: ago(3) }), action({ summary: "New", createdAt: ago(0) })],
    );
    expect(roster[0].currentTask).toContain("New");
    expect(roster[0].currentTask).toContain("Scanning");
    expect(roster[0].completedActions).toBe(2);
    expect(roster[0].online).toBe(true);
  });

  it("marks error/blocked agents as offline and counts online", () => {
    const roster = agentRoster(
      [agent({ kind: "legal", status: "error" }), agent({ kind: "privacy", status: "running" })],
      [],
    );
    expect(onlineAgentCount(roster)).toBe(1);
    const legal = roster.find((a) => a.kind === "legal")!;
    expect(legal.online).toBe(false);
    expect(legal.currentTask).toBeUndefined();
  });

  it("locks agents not in the available plan set", () => {
    const roster = agentRoster(
      [agent({ kind: "discovery", status: "running" }), agent({ kind: "executive", status: "running" })],
      [action({ agent: "executive", summary: "VIP sweep" })],
      new Set(["discovery"]),
    );
    const exec = roster.find((a) => a.kind === "executive")!;
    expect(exec.locked).toBe(true);
    expect(exec.status).toBe("locked");
    expect(exec.online).toBe(false);
    expect(exec.currentTask).toBeUndefined();
    expect(exec.itemsHandled).toBe(0);

    const disc = roster.find((a) => a.kind === "discovery")!;
    expect(disc.locked).toBe(false);
    expect(disc.online).toBe(true);
    expect(onlineAgentCount(roster)).toBe(1);
  });
});
