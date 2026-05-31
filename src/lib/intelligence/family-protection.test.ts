import { describe, it, expect } from "vitest";
import { assessFamily, assessMember, categorize, summarizeFamily } from "./family-protection";
import type { FamilyMember } from "@/lib/suite-types";

const m = (over: Partial<FamilyMember>): FamilyMember => ({
  id: Math.random().toString(36).slice(2), displayName: "X Vance", relation: "Spouse",
  isMinor: false, riskLevel: "low", exposuresCount: 0, ...over,
});

describe("categorize", () => {
  it("classifies minors, elders and adults", () => {
    expect(categorize(m({ isMinor: true }))).toBe("minor");
    expect(categorize(m({ relation: "Parent (72)" }))).toBe("elder");
    expect(categorize(m({ relation: "Grandmother" }))).toBe("elder");
    expect(categorize(m({ relation: "Spouse" }))).toBe("adult");
  });
});

describe("assessMember", () => {
  it("gives minors category-specific, school-first safeguards", () => {
    const a = assessMember(m({ isMinor: true, riskLevel: "critical", exposuresCount: 2 }));
    expect(a.category).toBe("minor");
    expect(a.status).toBe("critical");
    expect(a.safeguards[0].task).toMatch(/school directories/i);
  });

  it("scores a clean adult as fully protected", () => {
    const a = assessMember(m({ riskLevel: "low", exposuresCount: 0 }));
    expect(a.protectionScore).toBe(100);
    expect(a.status).toBe("protected");
  });

  it("weighs a minor's exposure heavier than an adult's", () => {
    const minor = assessMember(m({ isMinor: true, riskLevel: "high", exposuresCount: 2 }));
    const adult = assessMember(m({ isMinor: false, relation: "Spouse", riskLevel: "high", exposuresCount: 2 }));
    expect(minor.protectionScore).toBeLessThan(adult.protectionScore);
  });
});

describe("summarizeFamily", () => {
  it("summarizes posture and builds a plan for at-risk members", () => {
    const fam = [
      m({ displayName: "Mia", isMinor: true, riskLevel: "critical", exposuresCount: 2 }),
      m({ displayName: "Theo", isMinor: true, riskLevel: "low", exposuresCount: 0 }),
      m({ displayName: "Eleanor", relation: "Parent (72)", riskLevel: "high", exposuresCount: 3 }),
    ];
    const s = summarizeFamily(fam);
    expect(s.members).toBe(3);
    expect(s.minors).toBe(2);
    expect(s.atRisk).toBe(2);
    expect(s.totalExposures).toBe(5);
    expect(s.posture).toBe("critical");
    expect(s.mostExposed?.member.displayName).toBe("Mia");
    // plan covers the two at-risk members, hardest first
    expect(s.plan[0].member).toBe("Mia");
    expect(s.plan).toHaveLength(2);
  });

  it("is secure for an all-clear family", () => {
    const s = summarizeFamily([m({ riskLevel: "low" }), m({ riskLevel: "low" })]);
    expect(s.posture).toBe("secure");
    expect(s.protectionScore).toBe(100);
    expect(s.plan).toHaveLength(0);
  });

  it("orders the roster highest-risk first", () => {
    const ranked = assessFamily([m({ riskLevel: "low" }), m({ riskLevel: "critical" }), m({ riskLevel: "medium" })]);
    expect(ranked.map((a) => a.member.riskLevel)).toEqual(["critical", "medium", "low"]);
  });
});
