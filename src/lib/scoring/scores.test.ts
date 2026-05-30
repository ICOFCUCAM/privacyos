import { describe, expect, it } from "vitest";
import {
  businessScore,
  computeScoreSet,
  executiveScore,
  reputationScore,
} from "./scores";
import type { RiskScore } from "@/lib/types";
import type { CredentialLeak, Incident, Mention } from "@/lib/suite-types";

const baseRisk: RiskScore = {
  overall: 50,
  identity: 40,
  reputation: 30,
  financial: 20,
  security: 60,
  family: 25,
  trend: [],
};

describe("scores", () => {
  it("reputation rises with defamatory page-one negatives", () => {
    const mild: Mention[] = [
      { id: "1", subjectId: "s", channel: "news", sourceName: "x", title: "t", excerpt: "", sentiment: "neutral", sentimentScore: 0, isDefamatory: false, detectedAt: "" },
    ];
    const harsh: Mention[] = [
      { id: "2", subjectId: "s", channel: "news", sourceName: "x", title: "t", excerpt: "", sentiment: "negative", sentimentScore: -0.9, searchRank: 1, isDefamatory: true, detectedAt: "" },
    ];
    expect(reputationScore(harsh)).toBeGreaterThan(reputationScore(mild));
  });

  it("executive score ignores resolved incidents", () => {
    const open: Incident[] = [
      { id: "1", subjectId: "s", kind: "doxxing", title: "t", detail: "", riskLevel: "critical", status: "open", evidenceCount: 0, detectedAt: "", updatedAt: "" },
    ];
    const resolved: Incident[] = [{ ...open[0], status: "resolved" }];
    expect(executiveScore(open)).toBeGreaterThan(executiveScore(resolved));
    expect(executiveScore(resolved)).toBe(0);
  });

  it("business score grows with credential leaks", () => {
    const leaks: CredentialLeak[] = [
      { id: "1", account: "a@x.com", breachName: "B", dataClasses: ["Passwords"], pwnCount: 1, riskLevel: "critical" },
    ];
    expect(businessScore(leaks)).toBeGreaterThan(businessScore([]));
  });

  it("overall blends all axes and stays within 0–100", () => {
    const set = computeScoreSet({ risk: baseRisk });
    expect(set.overall).toBeGreaterThanOrEqual(0);
    expect(set.overall).toBeLessThanOrEqual(100);
    expect(set.privacy).toBe(50);
    expect(set.identity).toBe(40);
  });
});
