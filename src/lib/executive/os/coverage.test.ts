import { describe, it, expect } from "vitest";
import { protectionCoverage, summarizeCoverage, type CoverageCounts } from "./coverage";

const counts = (over: Partial<CoverageCounts> = {}): CoverageCounts => ({
  residenceExposed: 0, doxxingLeaks: 0, impersonationActive: 0, darkWebActive: 0,
  actorsActive: 0, familyAtRisk: 0, travelElevated: 0, ...over,
});

describe("protectionCoverage", () => {
  it("covers all seven pillars and flags status by count", () => {
    const cov = protectionCoverage(counts({ doxxingLeaks: 3, darkWebActive: 1 }));
    expect(cov).toHaveLength(7);
    const byKey = Object.fromEntries(cov.map((p) => [p.key, p]));
    expect(byKey.doxxingLeaks.status).toBe("action_required");
    expect(byKey.darkWebActive.status).toBe("action_required");
    expect(byKey.residenceExposed.status).toBe("secure");
  });

  it("sorts pillars needing the most action first", () => {
    const cov = protectionCoverage(counts({ doxxingLeaks: 5, darkWebActive: 2 }));
    expect(cov[0].key).toBe("doxxingLeaks");
    expect(cov[1].key).toBe("darkWebActive");
  });

  it("summarizes secure vs needing-action", () => {
    const cov = protectionCoverage(counts({ residenceExposed: 1, familyAtRisk: 2 }));
    const s = summarizeCoverage(cov);
    expect(s.pillars).toBe(7);
    expect(s.needingAction).toBe(2);
    expect(s.secure).toBe(5);
  });

  it("is all-secure for a clean principal", () => {
    expect(summarizeCoverage(protectionCoverage(counts()))).toMatchObject({ secure: 7, needingAction: 0 });
  });
});
