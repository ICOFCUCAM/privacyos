import { describe, it, expect } from "vitest";
import { protectionSuite, summarizeSuite, type SuiteInput } from "./protection-suite";

const base: SuiteInput = {
  exposures: [], threats: [], mentions: [], familyMembers: [], travelAlerts: [],
  credentialLeaks: [], domainRisks: [], employeeExposures: [], thirdPartyRisks: [], subjectEmails: [],
};

describe("protectionSuite", () => {
  it("returns one row per domain with a band + interpretation", () => {
    const rows = protectionSuite(base);
    expect(rows.map((r) => r.key).sort()).toEqual(["brand", "executive", "family", "identity", "reputation", "travel"]);
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
    // rows are sorted worst-first by risk-equivalent
    const eq = (r: typeof rows[number]) => (r.higherIsWorse ? r.score : 100 - r.score);
    expect([...rows].sort((a, b) => eq(b) - eq(a))).toEqual(rows);
  });

  it("summarizes domains / at-risk / worst", () => {
    const s = summarizeSuite(protectionSuite(base));
    expect(s.domains).toBe(6);
    expect(s.worst).not.toBeNull();
    expect(s.atRisk).toBeGreaterThanOrEqual(0);
  });
});
