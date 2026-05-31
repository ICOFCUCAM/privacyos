import { describe, it, expect } from "vitest";
import { liveDetectorAccuracy, type LiveDetectionInput } from "./live-accuracy";
import type { CredentialLeak, DomainRisk, Incident } from "@/lib/suite-types";

const incident = (over: Partial<Incident>): Incident => ({
  id: "i1", subjectId: "s1", kind: "deepfake", title: "x", detail: "", riskLevel: "critical",
  status: "open", evidenceCount: 3, detectedAt: "2026-05-30T00:00:00Z", updatedAt: "2026-05-31T00:00:00Z", ...over,
});
const leak = (over: Partial<CredentialLeak>): CredentialLeak => ({
  id: "c1", account: "a@x.com", breachName: "B", dataClasses: ["Passwords", "SSN"], pwnCount: 1_000_000, riskLevel: "critical", ...over,
});
const domainRisk = (over: Partial<DomainRisk>): DomainRisk => ({
  id: "d1", domainId: "dom1", domain: "vancecapltal.com", kind: "typosquat", detail: "", riskLevel: "high", resolved: false, detectedAt: "2026-05-30T00:00:00Z", ...over,
});

describe("liveDetectorAccuracy", () => {
  it("scores all three detectors over the footprint", () => {
    const input: LiveDetectionInput = {
      incidents: [incident({})],
      credentialLeaks: [leak({})],
      domainRisks: [domainRisk({ domain: "vancecapltal.com" })],
      exposures: [],
      primaryDomain: "vancecapital.com",
    };
    const { detectors, blended } = liveDetectorAccuracy(input);
    expect(detectors).toHaveLength(3);
    expect(detectors.every((d) => d.accuracy >= 0 && d.accuracy <= 100)).toBe(true);
    expect(blended).toBeGreaterThan(0);
  });

  it("flags a typosquat as high impersonation confidence", () => {
    const { detectors } = liveDetectorAccuracy({
      incidents: [], credentialLeaks: [],
      domainRisks: [domainRisk({ domain: "vancecapltal.com" })],
      exposures: [], primaryDomain: "vancecapital.com",
    });
    const imp = detectors.find((d) => d.detector === "impersonation")!;
    expect(imp.evaluated).toBe(1);
    expect(imp.accuracy).toBeGreaterThan(60); // near-miss look-alike
  });

  it("reports 0 accuracy / 0 evaluated for detectors with no inputs", () => {
    const { detectors, blended } = liveDetectorAccuracy({
      incidents: [], credentialLeaks: [], domainRisks: [], exposures: [],
    });
    expect(detectors.every((d) => d.evaluated === 0 && d.accuracy === 0)).toBe(true);
    expect(blended).toBe(0);
  });

  it("blends volume-weighted across detectors", () => {
    const { blended } = liveDetectorAccuracy({
      incidents: [incident({}), incident({})],
      credentialLeaks: [leak({})],
      domainRisks: [domainRisk({})],
      exposures: [],
      primaryDomain: "vancecapital.com",
    });
    expect(blended).toBeGreaterThan(0);
    expect(blended).toBeLessThanOrEqual(100);
  });
});
