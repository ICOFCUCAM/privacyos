import { describe, it, expect } from "vitest";
import { isValidEmail, splitSerpResults, mentionsToExposures, liveExposureScan } from "./live-scan";
import { brokerForDomain } from "./data-brokers";

describe("isValidEmail", () => {
  it("accepts plausible emails and rejects junk", () => {
    expect(isValidEmail("jordan@example.com")).toBe(true);
    expect(isValidEmail("a@b.co")).toBe(true);
    expect(isValidEmail("nope")).toBe(false);
    expect(isValidEmail("no@domain")).toBe(false);
    expect(isValidEmail(undefined)).toBe(false);
  });
});

describe("brokerForDomain", () => {
  it("matches known broker domains (incl. www. and subdomains), else null", () => {
    expect(brokerForDomain("spokeo.com")).toBe("Spokeo");
    expect(brokerForDomain("www.whitepages.com")).toBe("Whitepages");
    expect(brokerForDomain("results.beenverified.com")).toBe("BeenVerified");
    expect(brokerForDomain("techcrunch.com")).toBeNull();
  });
});

describe("splitSerpResults", () => {
  it("routes broker-domain hits to the brokers layer and the rest to search", () => {
    const { brokers, search } = splitSerpResults(
      [
        { position: 1, title: "Jordan on Spokeo", url: "https://spokeo.com/jordan", domain: "spokeo.com" },
        { position: 2, title: "Jordan — Whitepages", url: "https://www.whitepages.com/j", domain: "www.whitepages.com" },
        { position: 5, title: "Jordan's blog", url: "https://jordan.blog/x", domain: "jordan.blog" },
      ],
      "s1",
      "2026-01-01T00:00:00Z",
    );
    expect(brokers.map((b) => b.sourceName)).toEqual(["Spokeo", "Whitepages"]);
    expect(brokers.every((b) => b.source === "data_broker" && b.riskLevel === "high")).toBe(true);
    expect(search).toHaveLength(1);
    expect(search[0].source).toBe("search_engine");
  });
});

describe("mentionsToExposures", () => {
  it("maps news mentions to news exposures", () => {
    const ex = mentionsToExposures(
      [{ sourceName: "techcrunch.com", url: "https://tc.com/a", title: "Profile piece" }],
      "s1",
      "2026-01-01T00:00:00Z",
    );
    expect(ex[0].source).toBe("news");
    expect(ex[0].sourceName).toBe("techcrunch.com");
  });
});

describe("liveExposureScan", () => {
  const baseDeps = {
    // GDELT off by default in tests
    news: { fetch: async () => ({ mentions: [], live: false }) },
  };

  it("runs HIBP when an email + key are present and marks the breaches layer live", async () => {
    const breach = {
      scan: async () => ({
        exposures: [{ id: "b1", subjectId: "s1", category: "credential" as const, source: "breach_db" as const, sourceName: "LinkedIn", snippet: "", riskLevel: "high" as const, riskScore: 38, status: "discovered" as const, discoveredAt: "", lastSeenAt: "" }],
        threats: [],
        log: [],
      }),
    };
    const r = await liveExposureScan(
      { name: "Jordan", email: "jordan@example.com", subjectId: "s1" },
      { ...baseDeps, breach, env: { HIBP_API_KEY: "x" } },
    );
    expect(r.keysConfigured).toBe(true);
    expect(r.liveLayers).toContain("breaches");
    expect(r.exposures).toHaveLength(1);
  });

  it("runs SERP and marks both brokers and reputation live when results include a broker", async () => {
    const serp = {
      search: async () => ({
        live: true,
        provider: "serper" as const,
        results: [
          { position: 1, title: "Jordan — Spokeo", url: "https://spokeo.com/j", domain: "spokeo.com" },
          { position: 2, title: "Jordan's site", url: "https://x.com", domain: "x.com" },
        ],
      }),
    };
    const r = await liveExposureScan(
      { name: "Jordan", subjectId: "s1" },
      { ...baseDeps, serp, env: { SERPER_API_KEY: "x" } },
    );
    expect(r.keysConfigured).toBe(true);
    expect(r.liveLayers).toContain("brokers");
    expect(r.liveLayers).toContain("reputation");
  });

  it("reports keysConfigured=false and no live layers when nothing is wired", async () => {
    const r = await liveExposureScan({ name: "Jordan", subjectId: "s1" }, { ...baseDeps, env: {} });
    expect(r.keysConfigured).toBe(false);
    expect(r.liveLayers).toEqual([]);
    expect(r.exposures).toEqual([]);
  });
});
