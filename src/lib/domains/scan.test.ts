import { describe, it, expect } from "vitest";
import { scanDomain } from "./scan";
import { assessDomain, type DohClient } from "./dns";

describe("assessDomain (DNS posture)", () => {
  it("flags missing SPF, DMARC and MX", () => {
    const risks = assessDomain({ apexTxt: [], dmarcTxt: [], mx: [] });
    const details = risks.map((r) => r.detail.toLowerCase()).join(" ");
    expect(details).toMatch(/spf/);
    expect(details).toMatch(/dmarc/);
    expect(details).toMatch(/mx/);
  });

  it("a hardened domain (SPF + DMARC reject + MX) has no risks", () => {
    const risks = assessDomain({
      apexTxt: ["v=spf1 include:_spf.google.com ~all"],
      dmarcTxt: ["v=DMARC1; p=reject; rua=mailto:dmarc@acme.com"],
      mx: ["10 aspmx.l.google.com"],
    });
    expect(risks).toHaveLength(0);
  });

  it("p=none DMARC is flagged as monitor-only", () => {
    const risks = assessDomain({
      apexTxt: ["v=spf1 ~all"],
      dmarcTxt: ["v=DMARC1; p=none"],
      mx: ["10 mx.acme.com"],
    });
    expect(risks.some((r) => /p=none/i.test(r.detail))).toBe(true);
  });
});

describe("scanDomain (orchestration)", () => {
  it("returns no domain when the subject has no corporate domain", async () => {
    const res = await scanDomain({ emails: [], organization: undefined });
    expect(res.domain).toBeNull();
    expect(res.live).toBe(false);
    expect(res.risks).toHaveLength(0);
  });

  it("resolves and assesses a corporate domain via an injected client", async () => {
    const fake = {
      txt: async (name: string) => (name.startsWith("_dmarc") ? [] : []),
      mx: async () => [],
    } as unknown as DohClient;
    const res = await scanDomain({ emails: ["ceo@acme.com"], organization: "Acme" }, fake);
    expect(res.domain).toBe("acme.com");
    expect(res.live).toBe(true);
    expect(res.risks.length).toBeGreaterThan(0); // empty DNS → spoofable
  });
});
