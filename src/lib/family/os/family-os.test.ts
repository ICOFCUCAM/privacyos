import { describe, it, expect } from "vitest";
import {
  categorizeRelation, buildRegistry, sharedExposures, memberRisks, buildFamilyGraph,
  childSafety, exposureTracking, familyOverview,
} from "./family-os";
import type { Exposure } from "@/lib/types";
import type { FamilyMember } from "@/lib/suite-types";

const member = (over: Partial<FamilyMember>): FamilyMember => ({
  id: Math.random().toString(36).slice(2), displayName: "X", relation: "Relative", isMinor: false, riskLevel: "low", exposuresCount: 0, ...over,
});
const exposure = (over: Partial<Exposure>): Exposure => ({
  id: Math.random().toString(36).slice(2), subjectId: "s", category: "address", source: "data_broker", sourceName: "Spokeo",
  snippet: "", riskLevel: "high", riskScore: 30, status: "discovered", discoveredAt: "", lastSeenAt: "", ...over,
});

const roster: FamilyMember[] = [
  member({ relation: "Spouse", riskLevel: "high", exposuresCount: 3 }),
  member({ relation: "Child (14)", isMinor: true, riskLevel: "critical", exposuresCount: 2 }),
  member({ relation: "Child (11)", isMinor: true, riskLevel: "medium", exposuresCount: 1 }),
  member({ relation: "Parent (72)", riskLevel: "high", exposuresCount: 1 }),
  member({ relation: "Cousin", riskLevel: "low", exposuresCount: 0 }),
];

describe("registry", () => {
  it("categorizes relations into spouse/child/parent/relative", () => {
    expect(categorizeRelation("Spouse")).toBe("spouse");
    expect(categorizeRelation("Child (14)")).toBe("child");
    expect(categorizeRelation("Parent (72)")).toBe("parent");
    expect(categorizeRelation("Cousin")).toBe("relative");
  });
  it("groups the roster, non-empty groups in order", () => {
    const reg = buildRegistry(roster);
    expect(reg.map((g) => g.category)).toEqual(["spouse", "child", "parent", "relative"]);
    expect(reg.find((g) => g.category === "child")!.members).toHaveLength(2);
  });
});

describe("risk propagation / graph", () => {
  const exposures = [exposure({ category: "address", riskLevel: "critical" }), exposure({ category: "photo", riskLevel: "high" }), exposure({ category: "email" })];

  it("sharedExposures keeps only household-shared categories", () => {
    expect(sharedExposures(exposures).map((e) => e.category).sort()).toEqual(["address", "photo"]);
  });

  it("propagates shared risk to members, minors more heavily, sorted worst-first", () => {
    const risks = memberRisks(roster, sharedExposures(exposures));
    expect(risks.every((r) => r.total >= 0 && r.total <= 100)).toBe(true);
    // a minor and an adult with the same own-profile would differ via propagation
    const minor = memberRisks([member({ isMinor: true, riskLevel: "low" })], sharedExposures(exposures))[0];
    const adult = memberRisks([member({ isMinor: false, riskLevel: "low" })], sharedExposures(exposures))[0];
    expect(minor.propagated).toBeGreaterThan(adult.propagated);
    expect([...risks].sort((a, b) => b.total - a.total)).toEqual(risks);
  });

  it("graph reaches every member when shared exposures exist", () => {
    const g = buildFamilyGraph("Jane", roster, exposures);
    expect(g.edges).toHaveLength(roster.length);
    expect(g.propagationReach).toBe(roster.length);
    const none = buildFamilyGraph("Jane", roster, [exposure({ category: "email" })]);
    expect(none.propagationReach).toBe(0);
  });
});

describe("child safety", () => {
  it("monitors minors and raises alerts on high-risk members", () => {
    const risks = memberRisks(roster, sharedExposures([exposure({ category: "address", riskLevel: "critical" })]));
    const safety = childSafety(risks);
    expect(safety.minors).toBe(2);
    expect(safety.alerts.length).toBeGreaterThan(0);
    expect(safety.highestChildRisk).toBeGreaterThan(0);
  });
});

describe("exposure tracking", () => {
  it("tracks photos/school/social/location from real signals", () => {
    const vectors = exposureTracking(roster, [exposure({ category: "photo" }), exposure({ category: "address" })]);
    const by = Object.fromEntries(vectors.map((v) => [v.vector, v]));
    expect(by.photos.status).toBe("exposed");           // photo exposure present
    expect(by.location.status).toBe("exposed");          // address exposure present
    expect(by.location.affected).toBe(roster.length);    // whole household
    expect(by.school.affected).toBe(2);                  // two minors
    expect(vectors).toHaveLength(4);
  });
});

describe("familyOverview", () => {
  it("rolls up members, minors, mean risk, alerts and reach", () => {
    const o = familyOverview(roster, [exposure({ category: "address", riskLevel: "critical" })]);
    expect(o.members).toBe(5);
    expect(o.minors).toBe(2);
    expect(o.familyRisk).toBeGreaterThan(0);
    expect(o.propagationReach).toBe(5);
  });
  it("is empty/zero for no family", () => {
    expect(familyOverview([], [])).toMatchObject({ members: 0, minors: 0, familyRisk: 0, alerts: 0 });
  });
});
