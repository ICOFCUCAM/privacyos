import { describe, it, expect } from "vitest";
import { brandRiskIndices, brandBand, brandImpersonation, brandOverview, type BrandRiskInput } from "./brand-os";
import type { DomainRisk, EmployeeExposure, ThirdPartyRisk, CredentialLeak } from "@/lib/suite-types";

const domain = (over: Partial<DomainRisk>): DomainRisk => ({
  id: Math.random().toString(36).slice(2), domainId: "d", domain: "examp1e.com", kind: "typosquat",
  detail: "lookalike", riskLevel: "high", resolved: false, detectedAt: "2026-05-01T00:00:00Z", ...over,
});
const emp = (over: Partial<EmployeeExposure>): EmployeeExposure => ({
  id: Math.random().toString(36).slice(2), employeeEmail: "a@co.com", exposureType: "Credential", riskLevel: "high",
  source: "dark_web", detectedAt: "2026-05-01T00:00:00Z", ...over,
});
const vendor = (over: Partial<ThirdPartyRisk>): ThirdPartyRisk => ({
  id: Math.random().toString(36).slice(2), vendorName: "Acme", category: "SaaS", riskScore: 60, riskLevel: "high",
  findings: "f", assessedAt: "2026-05-01T00:00:00Z", ...over,
});
const leak = (over: Partial<CredentialLeak>): CredentialLeak => ({
  id: Math.random().toString(36).slice(2), account: "a@co.com", breachName: "B", dataClasses: ["Passwords"], pwnCount: 1000, riskLevel: "high", ...over,
});

const empty: BrandRiskInput = { domainRisks: [], employeeExposures: [], thirdPartyRisks: [], credentialLeaks: [] };

describe("brand risk indices", () => {
  it("composes four sub-indices into a banded composite, 0–100", () => {
    const r = brandRiskIndices({
      domainRisks: [domain({ riskLevel: "critical" }), domain({ kind: "phishing", riskLevel: "high" })],
      employeeExposures: [emp({ riskLevel: "critical" })],
      thirdPartyRisks: [vendor({ riskLevel: "high" })],
      credentialLeaks: [leak({ riskLevel: "critical" })],
    });
    for (const v of [r.overall, r.domain, r.workforce, r.supplyChain, r.credential]) {
      expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(100);
    }
    expect(r.domain).toBeGreaterThan(0);
    expect(r.band).toBe(brandBand(r.overall));
  });

  it("excludes resolved domain risks from the domain index", () => {
    const active = brandRiskIndices({ ...empty, domainRisks: [domain({ riskLevel: "critical" })] });
    const resolved = brandRiskIndices({ ...empty, domainRisks: [domain({ riskLevel: "critical", resolved: true })] });
    expect(active.domain).toBeGreaterThan(resolved.domain);
    expect(resolved.domain).toBe(0);
  });

  it("is all-zero / low for a clean org", () => {
    const r = brandRiskIndices(empty);
    expect(r.overall).toBe(0);
    expect(r.band).toBe("low");
  });
});

describe("brand impersonation", () => {
  it("keeps only lookalike/phishing domains, unresolved & worst first", () => {
    const imp = brandImpersonation([
      domain({ domain: "a.com", kind: "typosquat", riskLevel: "medium" }),
      domain({ domain: "b.com", kind: "phishing", riskLevel: "critical" }),
      domain({ domain: "c.com", kind: "expired_cert" }),          // excluded
      domain({ domain: "d.com", kind: "phishing", resolved: true }), // resolved sorts last
    ]);
    expect(imp.map((d) => d.domain)).toEqual(["b.com", "a.com", "d.com"]);
  });
});

describe("brandOverview", () => {
  it("rolls up the brand posture", () => {
    const o = brandOverview({
      domainRisks: [domain({}), domain({ resolved: true })],
      employeeExposures: [emp({ employeeEmail: "a@co.com" }), emp({ employeeEmail: "a@co.com" }), emp({ employeeEmail: "b@co.com" })],
      thirdPartyRisks: [vendor({ riskLevel: "critical" }), vendor({ riskLevel: "low" })],
      credentialLeaks: [leak({})],
    });
    expect(o.domainRisks).toBe(1);          // unresolved only
    expect(o.exposedEmployees).toBe(2);     // distinct emails
    expect(o.vendorsAtRisk).toBe(1);        // high/critical only
    expect(o.impersonationDomains).toBe(1); // unresolved typosquat
    expect(o.brandRisk).toBeGreaterThan(0);
  });
});
