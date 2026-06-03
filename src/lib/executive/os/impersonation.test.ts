import { describe, it, expect } from "vitest";
import { impersonationReport, impersonationRecommendations, openImpersonationCases } from "./impersonation";
import type { Case, Exposure, Threat } from "@/lib/types";
import type { DomainRisk, Incident } from "@/lib/suite-types";

const threat = (over: Partial<Threat>): Threat => ({
  id: Math.random().toString(36).slice(2), subjectId: "s", kind: "impersonation", title: "Fake account", detail: "",
  riskLevel: "high", source: "social_media", detectedAt: "2026-05-01T00:00:00Z", acknowledged: false, ...over,
});
const incident = (over: Partial<Incident>): Incident => ({
  id: Math.random().toString(36).slice(2), subjectId: "s", kind: "deepfake", title: "Deepfake video", detail: "",
  riskLevel: "critical", status: "open", evidenceCount: 1, detectedAt: "2026-05-02T00:00:00Z", updatedAt: "2026-05-02T00:00:00Z", ...over,
});
const domain = (over: Partial<DomainRisk>): DomainRisk => ({
  id: Math.random().toString(36).slice(2), domainId: "d", domain: "examp1e.com", kind: "typosquat", detail: "",
  riskLevel: "medium", resolved: false, detectedAt: "2026-05-03T00:00:00Z", ...over,
});
const exposure = (over: Partial<Exposure>): Exposure => ({
  id: Math.random().toString(36).slice(2), subjectId: "s", category: "photo", source: "ai_generated", sourceName: "DeepSite",
  snippet: "AI image", riskLevel: "high", riskScore: 30, status: "discovered", discoveredAt: "2026-05-04T00:00:00Z", lastSeenAt: "2026-05-04T00:00:00Z", ...over,
});

describe("impersonationReport", () => {
  it("classifies signals across all four categories and counts active", () => {
    const r = impersonationReport({
      threats: [threat({ kind: "impersonation" }), threat({ kind: "deepfake", acknowledged: true })],
      incidents: [incident({ kind: "deepfake" })],
      domainRisks: [domain({ kind: "phishing" }), domain({ kind: "expired_cert" })], // expired_cert excluded
      exposures: [exposure({}), exposure({ source: "data_broker" })], // broker excluded
    });
    expect(r.byCategory.fake_profile).toBe(1);
    expect(r.byCategory.deepfake).toBe(2); // 1 threat (resolved) + 1 incident
    expect(r.byCategory.lookalike_domain).toBe(1); // phishing only
    expect(r.byCategory.synthetic_media).toBe(1); // ai_generated only
    expect(r.total).toBe(5);
    expect(r.active).toBe(4); // the acknowledged deepfake threat is resolved
    expect(r.highest).toBe("critical"); // active deepfake incident
    // active, highest-risk signal sorts first
    expect(r.signals[0].resolved).toBe(false);
  });

  it("recommends takedowns only for categories with active signals", () => {
    const r = impersonationReport({ threats: [threat({ kind: "impersonation" })], incidents: [], domainRisks: [], exposures: [] });
    const recs = impersonationRecommendations(r);
    expect(recs).toHaveLength(1);
    expect(recs[0].category).toBe("fake_profile");
    expect(recs[0].action).toMatch(/Report 1 impersonation profile/);
  });

  it("is empty for a clean principal", () => {
    const r = impersonationReport({ threats: [], incidents: [], domainRisks: [], exposures: [] });
    expect(r.total).toBe(0);
    expect(r.highest).toBeNull();
    expect(impersonationRecommendations(r)).toHaveLength(0);
  });
});

describe("openImpersonationCases", () => {
  const c = (over: Partial<Case>): Case => ({
    id: Math.random().toString(36).slice(2), subjectId: "s", type: "impersonation_takedown", title: "T",
    summary: "", status: "open", riskLevel: "high", assignedAgent: "deepfake", relatedExposureIds: [],
    createdAt: "2026-05-01T00:00:00Z", updatedAt: "2026-05-01T00:00:00Z", ...over,
  });
  it("returns open impersonation/deepfake cases, worst first", () => {
    const out = openImpersonationCases([
      c({ id: "a", type: "impersonation_takedown", riskLevel: "high" }),
      c({ id: "b", type: "deepfake_incident", riskLevel: "critical" }),
      c({ id: "r", status: "resolved" }),
      c({ id: "o", type: "data_broker_removal" }),
    ]);
    expect(out.map((x) => x.id)).toEqual(["b", "a"]);
  });
});
