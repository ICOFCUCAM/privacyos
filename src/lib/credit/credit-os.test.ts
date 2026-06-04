import { describe, it, expect } from "vitest";
import {
  creditBand, creditOverview, creditRecommendations, creditCasesFromAlerts,
  isFraudIndicator, type CreditProfile,
} from "./credit-os";
import { demoCreditProfile } from "./source";

const profile = (over: Partial<CreditProfile> = {}): CreditProfile => ({
  score: 690,
  scoreDelta: -30,
  alerts: [
    { id: "a", kind: "hard_inquiry", bureau: "experian", detail: "", riskLevel: "medium", detectedAt: "2026-05-01T00:00:00Z" },
    { id: "b", kind: "new_account", bureau: "transunion", detail: "", riskLevel: "high", detectedAt: "2026-05-03T00:00:00Z" },
    { id: "c", kind: "derogatory", bureau: "equifax", detail: "", riskLevel: "critical", detectedAt: "2026-05-02T00:00:00Z" },
  ],
  ...over,
});

describe("creditBand", () => {
  it("maps FICO ranges", () => {
    expect(creditBand(820)).toBe("excellent");
    expect(creditBand(700)).toBe("good");
    expect(creditBand(600)).toBe("fair");
    expect(creditBand(520)).toBe("poor");
  });
});

describe("creditOverview", () => {
  it("counts fraud indicators and sorts them first", () => {
    const o = creditOverview(profile(), { live: true });
    expect(o.fraudIndicators).toBe(2); // new_account + derogatory
    expect(o.bureausReporting).toBe(3);
    expect(isFraudIndicator(o.alerts[0].kind)).toBe(true); // fraud-first ordering
    expect(o.live).toBe(true);
    expect(o.band).toBe("good");
  });

  it("defaults to demo (live false)", () => {
    expect(creditOverview(profile()).live).toBe(false);
  });
});

describe("creditRecommendations", () => {
  it("recommends a freeze when fraud indicators are present", () => {
    const recs = creditRecommendations(creditOverview(profile()));
    expect(recs[0]).toMatchObject({ actionLabel: "Freeze credit", riskLevel: "critical" });
    expect(recs.some((r) => /dispute/i.test(r.title))).toBe(true);
    expect(recs.some((r) => /score drop/i.test(r.title))).toBe(true); // -30 <= -20
  });

  it("stays quiet on a clean file", () => {
    const recs = creditRecommendations(creditOverview(profile({ scoreDelta: 5, alerts: [] })));
    expect(recs).toHaveLength(0);
  });
});

describe("creditCasesFromAlerts", () => {
  it("opens one identity-theft case from fraud-indicative alerts, deduped", () => {
    const cases = creditCasesFromAlerts(profile().alerts, []);
    expect(cases).toHaveLength(1);
    expect(cases[0]).toMatchObject({ type: "breach_response", assignedAgent: "security" });
    expect(creditCasesFromAlerts(profile().alerts, ["Credit-file identity-theft review"])).toHaveLength(0);
  });

  it("opens nothing when there are only routine alerts", () => {
    const routine = [{ id: "x", kind: "hard_inquiry" as const, bureau: "experian" as const, detail: "", riskLevel: "low" as const, detectedAt: "" }];
    expect(creditCasesFromAlerts(routine, [])).toHaveLength(0);
  });
});

describe("demoCreditProfile", () => {
  it("is deterministic and PII-free per subject", () => {
    const now = Date.parse("2026-06-01T00:00:00Z");
    expect(demoCreditProfile("subject-1", now)).toEqual(demoCreditProfile("subject-1", now));
    const p = demoCreditProfile("subject-1", now);
    expect(p.score).toBeGreaterThanOrEqual(300);
    expect(p.score).toBeLessThanOrEqual(850);
  });
});
