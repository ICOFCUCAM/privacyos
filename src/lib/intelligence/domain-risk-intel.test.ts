import { describe, it, expect } from "vitest";
import { assessDomainRisk, domainRegister, summarizeDomains } from "./domain-risk-intel";
import type { Domain, DomainRisk } from "@/lib/suite-types";

const NOW = new Date("2026-05-31T00:00:00Z").getTime();
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();

const risk = (over: Partial<DomainRisk>): DomainRisk => ({
  id: Math.random().toString(36).slice(2), domainId: "d1", domain: "co.com", kind: "typosquat",
  detail: "x", riskLevel: "high", resolved: false, detectedAt: daysAgo(6), ...over,
});

const domain = (over: Partial<Domain>): Domain => ({
  id: "d1", domain: "co.com", isPrimary: true, riskCount: 1, highestRisk: "high", ...over,
});

describe("assessDomainRisk", () => {
  it("maps each kind to a fix action, workflow, cadence and owner", () => {
    const typo = assessDomainRisk(risk({ kind: "typosquat" }), NOW);
    expect(typo.action).toMatch(/takedown|UDRP/i);
    expect(typo.owner).toBe("Brand protection");
    expect(typo.workflow.length).toBeGreaterThan(0);

    const mx = assessDomainRisk(risk({ kind: "spoof_mx" }), NOW);
    expect(mx.action).toMatch(/DMARC/i);

    const cert = assessDomainRisk(risk({ kind: "expired_cert" }), NOW);
    expect(cert.action).toMatch(/certificate/i);
  });

  it("computes finding age", () => {
    expect(assessDomainRisk(risk({ detectedAt: daysAgo(6) }), NOW).ageDays).toBe(6);
  });
});

describe("summarizeDomains", () => {
  it("counts open risks, kinds and posture, ignoring resolved", () => {
    const s = summarizeDomains(
      [domain({}), domain({ id: "d2", domain: "co.fund" })],
      [
        risk({ kind: "typosquat", riskLevel: "high" }),
        risk({ kind: "spoof_mx", riskLevel: "medium" }),
        risk({ kind: "typosquat", riskLevel: "low", resolved: true }),
      ],
      NOW,
    );
    expect(s.monitoredDomains).toBe(2);
    expect(s.openRisks).toBe(2);
    expect(s.resolved).toBe(1);
    expect(s.byKind[0].kind).toBe("typosquat");
    expect(s.byKind[0].count).toBe(1); // resolved typosquat excluded
  });

  it("is critical when a critical risk is open", () => {
    const s = summarizeDomains([domain({})], [risk({ riskLevel: "critical" })], NOW);
    expect(s.postureLevel).toBe("critical");
  });
});

describe("domainRegister", () => {
  it("orders open + highest-severity first", () => {
    const reg = domainRegister([
      risk({ id: "low", riskLevel: "low", resolved: false }),
      risk({ id: "resolved-crit", riskLevel: "critical", resolved: true }),
      risk({ id: "open-high", riskLevel: "high", resolved: false }),
    ], NOW);
    expect(reg[0].risk.id).toBe("open-high");
    expect(reg[reg.length - 1].risk.resolved).toBe(true);
  });
});
