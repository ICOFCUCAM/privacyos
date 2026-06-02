import { describe, it, expect } from "vitest";
import { protectionSuite, summarizeSuite, type SuiteInput } from "./protection-suite";

const base: SuiteInput = {
  exposures: [], threats: [], mentions: [], familyMembers: [], travelAlerts: [],
  credentialLeaks: [], domainRisks: [], employeeExposures: [], thirdPartyRisks: [], subjectEmails: [],
};

describe("protectionSuite", () => {
  it("returns one row per domain with a band + interpretation", () => {
    const rows = protectionSuite(base);
    expect(rows.map((r) => r.key).sort()).toEqual(["brand", "executive", "family", "financial", "identity", "reputation", "travel"]);
    // reputation is a health score (higher = better), the rest are risk scores
    expect(rows.find((r) => r.key === "reputation")!.higherIsWorse).toBe(false);
    expect(rows.find((r) => r.key === "executive")!.higherIsWorse).toBe(true);
  });

  it("ranks the worst domain first (risk-equivalent)", () => {
    const rows = protectionSuite({
      ...base,
      exposures: [
        { id: "e1", subjectId: "s", category: "address", source: "data_broker", sourceName: "X", snippet: "", riskLevel: "critical", riskScore: 40, status: "discovered", discoveredAt: "", lastSeenAt: "" },
      ],
      threats: [
        { id: "t1", subjectId: "s", kind: "doxxing", title: "T", detail: "", riskLevel: "critical", source: "social_media", detectedAt: "", acknowledged: false },
      ],
    });
    // executive risk should be elevated by the critical physical signals
    const exec = rows.find((r) => r.key === "executive")!;
    expect(exec.score).toBeGreaterThan(0);
    // rows are sorted worst-band-first (the suite's primary ordering guarantee)
    const BAND_ORDER: Record<string, number> = { low: 0, elevated: 1, high: 2, critical: 3 };
    for (let i = 1; i < rows.length; i++) {
      expect(BAND_ORDER[rows[i - 1].band]).toBeGreaterThanOrEqual(BAND_ORDER[rows[i].band]);
    }
  });

  it("summarizes domains / at-risk / worst", () => {
    const s = summarizeSuite(protectionSuite(base));
    expect(s.domains).toBe(7);
    expect(s.worst).not.toBeNull();
    expect(s.atRisk).toBeGreaterThanOrEqual(0);
  });

  it("a clean principal flags nothing — no-coverage reputation isn't 'elevated'", () => {
    const rows = protectionSuite(base);
    const rep = rows.find((r) => r.key === "reputation")!;
    expect(rep.band).toBe("low");            // no mentions → no coverage, not elevated
    expect(rep.caption).toMatch(/no coverage/i);
    expect(summarizeSuite(rows).atRisk).toBe(0);
    // with real negative coverage, reputation is scored normally
    const withRep = protectionSuite({ ...base, mentions: [
      { id: "m", subjectId: "s", sourceName: "x", sourceType: "news", title: "bad", url: "", sentiment: "negative", sentimentScore: -0.9, publishedAt: "", channel: "news" } as never,
    ] });
    expect(withRep.find((r) => r.key === "reputation")!.caption).toMatch(/health/);
  });
});
