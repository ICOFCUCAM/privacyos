import { describe, expect, it, vi } from "vitest";
import { assessDomain, DohClient } from "./dns";
import { scanDomain } from "./scan";

describe("domain assessment", () => {
  it("flags missing SPF and DMARC as high risk", () => {
    const risks = assessDomain({ apexTxt: [], dmarcTxt: [], mx: ["10 mail.x.com"] });
    expect(risks.some((r) => r.detail.includes("No SPF") && r.riskLevel === "high")).toBe(true);
    expect(risks.some((r) => r.detail.includes("No DMARC"))).toBe(true);
  });

  it("treats DMARC p=none as a medium risk", () => {
    const risks = assessDomain({
      apexTxt: ["v=spf1 include:_spf.google.com ~all"],
      dmarcTxt: ["v=DMARC1; p=none; rua=mailto:dmarc@x.com"],
      mx: ["10 mail"],
    });
    expect(risks).toHaveLength(1);
    expect(risks[0].detail).toContain("p=none");
    expect(risks[0].riskLevel).toBe("medium");
  });

  it("returns no email-auth risks for a well-configured domain", () => {
    const risks = assessDomain({
      apexTxt: ["v=spf1 -all"],
      dmarcTxt: ["v=DMARC1; p=reject"],
      mx: ["10 mail"],
    });
    expect(risks.filter((r) => r.kind === "spoof_mx")).toHaveLength(0);
  });

  it("flags missing MX", () => {
    const risks = assessDomain({ apexTxt: ["v=spf1 -all"], dmarcTxt: ["v=DMARC1; p=reject"], mx: [] });
    expect(risks.some((r) => r.kind === "exposed_subdomain")).toBe(true);
  });

  it("DohClient parses the Answer array and strips quotes", async () => {
    const fakeFetch = vi.fn(async () =>
      new Response(JSON.stringify({ Answer: [{ data: '"v=spf1 -all"' }] }), { status: 200 }),
    ) as unknown as typeof fetch;
    const client = new DohClient(fakeFetch);
    expect(await client.txt("x.com")).toEqual(["v=spf1 -all"]);
  });

  it("scanDomain derives the domain from email and degrades on fetch failure", async () => {
    const failing = vi.fn(async () => { throw new Error("blocked"); }) as unknown as typeof fetch;
    const res = await scanDomain({ emails: ["ceo@acme.com"], organization: "Acme" }, new DohClient(failing));
    expect(res.domain).toBe("acme.com");
    expect(res.live).toBe(false);
    expect(res.risks.length).toBeGreaterThan(0);
  });

  it("scanDomain no-ops without a corporate domain", async () => {
    const res = await scanDomain({ emails: ["me@gmail.com"], organization: undefined });
    expect(res.domain).toBeNull();
    expect(res.risks).toHaveLength(0);
  });
});
