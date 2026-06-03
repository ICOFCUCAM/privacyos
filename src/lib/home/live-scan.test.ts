import { describe, it, expect } from "vitest";
import { isValidEmail, serpToExposures, mentionsToExposures, liveExposureScan } from "./live-scan";

describe("isValidEmail", () => {
  it("accepts plausible emails and rejects junk", () => {
    expect(isValidEmail("jordan@example.com")).toBe(true);
    expect(isValidEmail("a@b.co")).toBe(true);
    expect(isValidEmail("nope")).toBe(false);
    expect(isValidEmail("no@domain")).toBe(false);
    expect(isValidEmail(undefined)).toBe(false);
  });
});

describe("serpToExposures", () => {
  it("maps page-one results to search exposures, weighting the top spots higher", () => {
    const ex = serpToExposures(
      [
        { position: 1, title: "Jordan on Spokeo", url: "https://spokeo.com/jordan", domain: "spokeo.com" },
        { position: 7, title: "Old forum post", url: "https://forum.example/x", domain: "forum.example" },
      ],
      "s1",
      "2026-01-01T00:00:00Z",
    );
    expect(ex).toHaveLength(2);
    expect(ex[0].source).toBe("search_engine");
    expect(ex[0].sourceName).toBe("spokeo.com");
    expect(ex[0].riskLevel).toBe("medium"); // position <= 3
    expect(ex[1].riskLevel).toBe("low");
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

  it("runs SERP when a key is present and marks the reputation layer live", async () => {
    const serp = {
      search: async () => ({ live: true, provider: "serper" as const, results: [{ position: 1, title: "Result", url: "https://x.com", domain: "x.com" }] }),
    };
    const r = await liveExposureScan(
      { name: "Jordan", subjectId: "s1" },
      { ...baseDeps, serp, env: { SERPER_API_KEY: "x" } },
    );
    expect(r.keysConfigured).toBe(true);
    expect(r.liveLayers).toContain("reputation");
  });

  it("reports keysConfigured=false and no live layers when nothing is wired", async () => {
    const r = await liveExposureScan({ name: "Jordan", subjectId: "s1" }, { ...baseDeps, env: {} });
    expect(r.keysConfigured).toBe(false);
    expect(r.liveLayers).toEqual([]);
    expect(r.exposures).toEqual([]);
  });
});
