import { describe, it, expect, vi } from "vitest";
import { mapSerperOrganic, mapBingWebPages, resolveSerpSource, SerperSource, BingSerpSource, NoSerpSource } from "./serp-connector";
import { mapItunesPodcasts, ItunesPodcastSource } from "./podcast-connector";
import { classifyPageOne } from "./seo";
import { podcastOpportunities, discoverOpportunities } from "./intelligence";
import type { Subject } from "@/lib/types";
import type { Mention } from "@/lib/suite-types";

const subject: Subject = {
  id: "s", type: "individual", displayName: "Jordan Vance", emails: [], phones: [], usernames: [],
  organization: "Vance Capital", createdAt: "2026-01-01T00:00:00Z",
};

function jsonResponse(body: unknown): Response {
  return { ok: true, status: 200, json: async () => body } as Response;
}

describe("SERP connector", () => {
  it("maps Serper organic results to ranked positions", () => {
    const r = mapSerperOrganic([
      { title: "A", link: "https://www.linkedin.com/in/jv", position: 1 },
      { title: "B", link: "https://news.com/x" },
      { title: "no link" },
    ]);
    expect(r).toHaveLength(2);
    expect(r[0].domain).toBe("linkedin.com");
    expect(r[1].position).toBe(2); // index fallback
  });

  it("resolves the right source by env, preferring Bing", () => {
    expect(resolveSerpSource({})).toBeInstanceOf(NoSerpSource);
    expect(resolveSerpSource({ SERPER_API_KEY: "k" })).toBeInstanceOf(SerperSource);
    expect(resolveSerpSource({ BING_SEARCH_API_KEY: "b" })).toBeInstanceOf(BingSerpSource);
    // Bing wins when both are set
    expect(resolveSerpSource({ BING_SEARCH_API_KEY: "b", SERPER_API_KEY: "k" })).toBeInstanceOf(BingSerpSource);
  });

  it("maps Bing webPages to ranked positions", () => {
    const r = mapBingWebPages([
      { name: "A", url: "https://www.linkedin.com/in/jv" },
      { name: "B", url: "https://news.com/x" },
      { name: "no url" },
    ]);
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ position: 1, domain: "linkedin.com" });
    expect(r[1].position).toBe(2);
  });

  it("Bing source goes live on response, reports provider, falls back on error", async () => {
    const ok = new BingSerpSource("key", vi.fn(async () => jsonResponse({ webPages: { value: [{ name: "T", url: "https://x.com/a" }] } })) as unknown as typeof fetch);
    const a = await ok.search("q");
    expect(a.live).toBe(true);
    expect(a.provider).toBe("bing");
    expect(a.results[0].domain).toBe("x.com");

    const bad = new BingSerpSource("key", vi.fn(async () => { throw new Error("net"); }) as unknown as typeof fetch);
    expect((await bad.search("q")).live).toBe(false);
  });

  it("returns live results when the API responds, falls back on error", async () => {
    const ok = new SerperSource("k", vi.fn(async () => jsonResponse({ organic: [{ title: "T", link: "https://x.com/a", position: 1 }] })) as unknown as typeof fetch);
    const a = await ok.search("q");
    expect(a.live).toBe(true);
    expect(a.results[0].domain).toBe("x.com");

    const bad = new SerperSource("k", vi.fn(async () => { throw new Error("net"); }) as unknown as typeof fetch);
    const b = await bad.search("q");
    expect(b.live).toBe(false);
    expect(b.results).toEqual([]);
  });

  it("no-keys source never goes live", async () => {
    const a = await resolveSerpSource({}).search("q");
    expect(a.live).toBe(false);
  });
});

describe("classifyPageOne", () => {
  const mentions: Mention[] = [
    { id: "m1", subjectId: "s", channel: "news", sourceName: "bad.com", url: "https://bad.com/story", title: "Scandal", excerpt: "", sentiment: "negative", sentimentScore: -0.7, isDefamatory: false, detectedAt: "" },
  ];
  it("classifies live SERP slots via owned hosts and known mentions", () => {
    const p = classifyPageOne(subject, mentions, [
      { position: 1, title: "Profile", url: "https://linkedin.com/in/jv", domain: "linkedin.com" },
      { position: 2, title: "Scandal", url: "https://bad.com/story", domain: "bad.com" },
      { position: 3, title: "Vance Capital site", url: "https://vancecapital.com", domain: "vancecapital.com" },
      { position: 4, title: "Wiki", url: "https://wikipedia.org/x", domain: "wikipedia.org" },
    ]);
    expect(p.slots[0].sentiment).toBe("owned");   // linkedin
    expect(p.slots[1].sentiment).toBe("negative"); // matches negative mention domain
    expect(p.slots[2].sentiment).toBe("owned");    // org domain
    expect(p.slots[3].sentiment).toBe("neutral");
    expect(p.owned).toBe(2);
    expect(p.negative).toBe(1);
  });
});

describe("podcast connector", () => {
  it("maps iTunes results", () => {
    const p = mapItunesPodcasts([
      { collectionName: "Founders", artistName: "Acme", primaryGenreName: "Business", trackCount: 200 },
      { artistName: "no name" },
    ]);
    expect(p).toHaveLength(1);
    expect(p[0]).toMatchObject({ name: "Founders", genre: "Business", episodes: 200 });
  });

  it("goes live on results, falls back on error", async () => {
    const ok = new ItunesPodcastSource(vi.fn(async () => jsonResponse({ results: [{ collectionName: "Show", trackCount: 50 }] })) as unknown as typeof fetch);
    const a = await ok.search("biz");
    expect(a.live).toBe(true);
    expect(a.podcasts[0].name).toBe("Show");

    const bad = new ItunesPodcastSource(vi.fn(async () => { throw new Error("net"); }) as unknown as typeof fetch);
    expect((await bad.search("biz")).live).toBe(false);
  });

  it("live podcasts replace deterministic podcast opportunities", () => {
    const live = podcastOpportunities([{ name: "Real Show", publisher: "P", genre: "Business", episodes: 120 }]);
    const ops = discoverOpportunities(subject, live);
    const podcasts = ops.filter((o) => o.type === "podcast");
    expect(podcasts).toHaveLength(1);
    expect(podcasts[0].name).toBe("Real Show");
  });
});
