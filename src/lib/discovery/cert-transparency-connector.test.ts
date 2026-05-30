import { describe, expect, it, vi } from "vitest";
import {
  CertTransparencyConnector,
  parseSubdomains,
  subjectDomain,
} from "./cert-transparency-connector";
import type { Subject } from "@/lib/types";

function subject(emails: string[]): Subject {
  return { id: "s1", type: "business", displayName: "Co", emails, phones: [], usernames: [], createdAt: "" };
}

describe("certificate transparency connector", () => {
  it("derives the corporate domain, skipping free email providers", () => {
    expect(subjectDomain(subject(["a@gmail.com", "ceo@acme.com"]))).toBe("acme.com");
    expect(subjectDomain(subject(["a@gmail.com"]))).toBeUndefined();
  });

  it("parses crt.sh records: dedupes, strips wildcards, filters to the domain", () => {
    const subs = parseSubdomains(
      [
        { name_value: "*.acme.com\nwww.acme.com" },
        { name_value: "dev.acme.com" },
        { name_value: "dev.acme.com" },
        { name_value: "evil.com" },
        { name_value: "acme.com" },
      ],
      "acme.com",
    );
    expect(subs).toEqual(["dev.acme.com", "www.acme.com"]);
  });

  it("flags sensitive subdomains as high-risk exposures (live fetch)", async () => {
    const fakeFetch = vi.fn(async () =>
      new Response(JSON.stringify([{ name_value: "dev.acme.com" }, { name_value: "www.acme.com" }]), { status: 200 }),
    ) as unknown as typeof fetch;
    const conn = new CertTransparencyConnector(fakeFetch);
    const finding = await conn.scan({ subject: subject(["ceo@acme.com"]), existing: [] });
    expect(finding.exposures.some((e) => e.snippet.includes("dev.acme.com"))).toBe(true);
    expect(finding.exposures.every((e) => e.riskLevel === "high")).toBe(true);
    expect(finding.log[0]).toContain("Queried");
  });

  it("degrades to a deterministic fallback when the fetch fails", async () => {
    const failing = vi.fn(async () => {
      throw new Error("network blocked");
    }) as unknown as typeof fetch;
    const conn = new CertTransparencyConnector(failing);
    const finding = await conn.scan({ subject: subject(["ceo@acme.com"]), existing: [] });
    expect(finding.log[0]).toContain("Fallback");
    expect(finding.exposures.some((e) => e.snippet.includes("vpn.acme.com"))).toBe(true);
  });

  it("no-ops without a corporate domain", async () => {
    const conn = new CertTransparencyConnector();
    const finding = await conn.scan({ subject: subject(["a@gmail.com"]), existing: [] });
    expect(finding.exposures).toHaveLength(0);
  });
});
