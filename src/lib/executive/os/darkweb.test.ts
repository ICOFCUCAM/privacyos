import { describe, it, expect } from "vitest";
import { darkWebReport, darkWebRecommendations } from "./darkweb";
import type { Exposure, Threat } from "@/lib/types";
import type { CredentialLeak } from "@/lib/suite-types";

const leak = (over: Partial<CredentialLeak>): CredentialLeak => ({
  id: Math.random().toString(36).slice(2), account: "ceo@corp.com", breachName: "MegaBreach",
  dataClasses: ["Passwords", "Emails"], pwnCount: 2_000_000, riskLevel: "high", leakedAt: "2026-04-01T00:00:00Z", ...over,
});
const threat = (over: Partial<Threat>): Threat => ({
  id: Math.random().toString(36).slice(2), subjectId: "s", kind: "dark_web_mention", title: "Listing", detail: "",
  riskLevel: "high", source: "dark_web", detectedAt: "2026-05-01T00:00:00Z", acknowledged: false, ...over,
});
const exposure = (over: Partial<Exposure>): Exposure => ({
  id: Math.random().toString(36).slice(2), subjectId: "s", category: "email", source: "breach_db", sourceName: "Collection#1",
  snippet: "email in dump", riskLevel: "medium", riskScore: 18, status: "discovered", discoveredAt: "2026-05-02T00:00:00Z", lastSeenAt: "2026-05-02T00:00:00Z", ...over,
});

describe("darkWebReport", () => {
  it("classifies credential/mention/breach signals, counts active, sums records", () => {
    const r = darkWebReport({
      credentialLeaks: [leak({ pwnCount: 2_000_000 }), leak({ pwnCount: 500_000, riskLevel: "critical" })],
      threats: [threat({ kind: "dark_web_mention" }), threat({ kind: "credential_leak", acknowledged: true })],
      exposures: [exposure({ source: "breach_db" }), exposure({ source: "dark_web", sourceName: "ForumX" }), exposure({ source: "data_broker" })], // broker excluded
    });
    expect(r.byCategory.credential).toBe(3); // 2 leaks + 1 credential_leak threat
    expect(r.byCategory.dark_web_mention).toBe(2); // 1 threat + 1 dark_web exposure
    expect(r.byCategory.breach_exposure).toBe(1);
    expect(r.total).toBe(6);
    expect(r.active).toBe(5); // acknowledged credential_leak threat resolved
    expect(r.recordsExposed).toBe(2_500_000);
    expect(r.highest).toBe("critical");
    expect(r.signals[0].resolved).toBe(false); // active sorts first
  });

  it("recommends remediation only for active categories", () => {
    const r = darkWebReport({ credentialLeaks: [leak({})], threats: [], exposures: [] });
    const recs = darkWebRecommendations(r);
    expect(recs).toHaveLength(1);
    expect(recs[0].category).toBe("credential");
    expect(recs[0].action).toMatch(/rotate 1 leaked credential/i);
  });

  it("is empty for a clean principal", () => {
    const r = darkWebReport({ credentialLeaks: [], threats: [], exposures: [] });
    expect(r.total).toBe(0);
    expect(r.recordsExposed).toBe(0);
    expect(r.highest).toBeNull();
    expect(darkWebRecommendations(r)).toHaveLength(0);
  });
});
