import { describe, it, expect } from "vitest";
import { financialOverview, financialRecommendations, financialCaseToOpen, type FinancialInput } from "./financial-os";
import type { Exposure, Threat } from "@/lib/types";
import type { CredentialLeak } from "@/lib/suite-types";

const exposure = (over: Partial<Exposure> = {}): Exposure => ({
  id: Math.random().toString(36).slice(2), subjectId: "s1", category: "financial", source: "data_broker",
  sourceName: "Broker", snippet: "", riskLevel: "high", riskScore: 10, status: "monitoring",
  discoveredAt: "2026-01-01T00:00:00Z", lastSeenAt: "2026-01-01T00:00:00Z", ...over,
});
const leak = (account: string, over: Partial<CredentialLeak> = {}): CredentialLeak => ({
  id: Math.random().toString(36).slice(2), account, breachName: "BreachX", dataClasses: ["password"], pwnCount: 1000, riskLevel: "high", ...over,
});
const threat = (over: Partial<Threat> = {}): Threat => ({
  id: Math.random().toString(36).slice(2), subjectId: "s1", kind: "credential_leak", title: "Leak", detail: "",
  riskLevel: "high", source: "dark_web", detectedAt: "2026-01-01T00:00:00Z", acknowledged: false, ...over,
});
const input = (over: Partial<FinancialInput> = {}): FinancialInput => ({ exposures: [], credentialLeaks: [], threats: [], ...over });

describe("financial exposure OS", () => {
  it("a clean subject scores low with no findings or case", () => {
    const r = financialOverview(input());
    expect(r.overall).toBeLessThan(25);
    expect(r.band).toBe("low");
    expect(r.findings).toHaveLength(0);
    expect(r.caseWorthy).toBe(false);
    for (const k of ["identityTheft", "accountTakeover", "paymentExposure", "darkWebFinancial"] as const) {
      expect(r[k]).toBeGreaterThanOrEqual(0);
      expect(r[k]).toBeLessThanOrEqual(100);
    }
  });

  it("raises account-takeover for leaked money-bearing accounts", () => {
    const r = financialOverview(input({
      credentialLeaks: [leak("me@bank.com", { riskLevel: "critical" }), leak("paypal-login", { riskLevel: "high" })],
    }));
    expect(r.accountTakeover).toBeGreaterThan(40);
    expect(r.exposedAccounts).toBe(2);
    expect(r.findings.some((f) => f.kind === "account")).toBe(true);
    expect(r.recommendations.some((x) => /Secure your money/.test(x.title))).toBe(true);
  });

  it("raises payment exposure for exposed card/bank data", () => {
    const r = financialOverview(input({
      exposures: [exposure({ category: "financial", snippet: "card ending 4242", riskLevel: "critical" })],
    }));
    expect(r.paymentExposure).toBeGreaterThan(25);
    expect(r.recommendations.some((x) => /payment/i.test(x.title))).toBe(true);
  });

  it("flags identity-theft risk + a credit freeze for exposed financial PII", () => {
    const r = financialOverview(input({
      exposures: [exposure({ category: "credential", riskLevel: "critical" }), exposure({ category: "financial", riskLevel: "high" })],
      threats: [threat({ kind: "credential_leak", riskLevel: "critical" })],
    }));
    expect(r.identityTheft).toBeGreaterThan(40);
    expect(r.recommendations.some((x) => /credit freeze/i.test(x.title))).toBe(true);
  });

  it("becomes case-worthy under high combined risk", () => {
    const r = financialOverview(input({
      credentialLeaks: [leak("checking@bank.com", { riskLevel: "critical" })],
      exposures: [exposure({ category: "financial", riskLevel: "critical", snippet: "bank account number" })],
      threats: [threat({ kind: "dark_web_mention", riskLevel: "critical", title: "Card data for sale" })],
    }));
    expect(r.overall).toBeGreaterThanOrEqual(50);
    expect(r.caseWorthy).toBe(true);
    expect(r.findings.some((f) => f.kind === "darkweb")).toBe(true);
  });
});

describe("financial → platform pipeline mappers", () => {
  const risky = input({
    credentialLeaks: [
      leak("checking@bank.com", { riskLevel: "critical" }),
      leak("paypal-wallet", { riskLevel: "critical" }),
    ],
    exposures: [exposure({ category: "financial", riskLevel: "critical", snippet: "bank account number" })],
    threats: [threat({ kind: "dark_web_mention", riskLevel: "critical", title: "Card data for sale" })],
  });

  it("projects recommendations into the platform shape, owned by Security", () => {
    const recs = financialRecommendations(financialOverview(risky), "s1");
    expect(recs.length).toBeGreaterThan(0);
    for (const r of recs) {
      expect(r.agent).toBe("security");
      expect(r.subjectId).toBe("s1");
      expect(r.impact).toBeGreaterThan(0);
      expect(["low", "medium", "high", "critical"]).toContain(r.riskLevel);
    }
  });

  it("opens a breach_response case when case-worthy, escalating critical to incident", () => {
    const c = financialCaseToOpen(financialOverview(risky));
    expect(c).not.toBeNull();
    expect(c!.type).toBe("breach_response");
    expect(c!.assignedAgent).toBe("incident"); // critical → incident response
    expect(c!.riskLevel).toBe("critical");
    // a clean subject opens no case
    expect(financialCaseToOpen(financialOverview(input()))).toBeNull();
  });
});
