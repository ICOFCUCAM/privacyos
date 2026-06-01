import { describe, it, expect } from "vitest";
import { journalistsFromCoverage, resolveJournalists } from "./journalist-connector";
import type { Journalist } from "./media";
import type { Mention } from "@/lib/suite-types";

const NOW = new Date("2026-05-31T00:00:00Z").getTime();
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();

const mention = (over: Partial<Mention>): Mention => ({
  id: Math.random().toString(36).slice(2), subjectId: "s", channel: "news", sourceName: "TechCrunch",
  title: "Story", excerpt: "x", sentiment: "neutral", sentimentScore: 0, isDefamatory: false,
  detectedAt: daysAgo(2), ...over,
});

describe("journalistsFromCoverage", () => {
  it("groups news/blog mentions by outlet with a recent-article proof", () => {
    const j = journalistsFromCoverage([
      mention({ sourceName: "TechCrunch", title: "Newer", detectedAt: daysAgo(1), url: "https://tc.com/2" }),
      mention({ sourceName: "TechCrunch", title: "Older", detectedAt: daysAgo(10) }),
      mention({ sourceName: "Bloomberg", channel: "news" }),
      mention({ sourceName: "X (Twitter)", channel: "social" }), // excluded — not news/blog
    ], 8, NOW);
    expect(j).toHaveLength(2);
    const tc = j.find((x) => x.outlet === "TechCrunch")!;
    expect(tc.provider).toBe("coverage");
    expect(tc.recentArticleTitle).toBe("Newer"); // most recent kept
    expect(tc.recentArticleUrl).toBe("https://tc.com/2");
  });

  it("ranks positive, recent, frequent coverage higher", () => {
    const [top] = journalistsFromCoverage([
      mention({ sourceName: "Good", sentiment: "positive", detectedAt: daysAgo(1) }),
      mention({ sourceName: "Good", sentiment: "positive", detectedAt: daysAgo(2) }),
      mention({ sourceName: "Bad", sentiment: "negative", detectedAt: daysAgo(25) }),
    ], 8, NOW);
    expect(top.outlet).toBe("Good");
    expect(top.relevance).toBeGreaterThan(60);
  });

  it("respects the limit and excludes non-coverage channels", () => {
    const many = Array.from({ length: 12 }, (_, i) => mention({ sourceName: `Outlet${i}` }));
    expect(journalistsFromCoverage(many, 5, NOW)).toHaveLength(5);
    expect(journalistsFromCoverage([mention({ channel: "review" })], 8, NOW)).toHaveLength(0);
  });
});

describe("resolveJournalists", () => {
  const curated: Journalist[] = [{ name: "A. Rivera", outlet: "TechCrunch", beat: "VC", relevance: 92 }];

  it("prefers live coverage and flags it", () => {
    const r = resolveJournalists([mention({ sourceName: "Reuters" })], curated, 8, NOW);
    expect(r.live).toBe(true);
    expect(r.journalists[0].provider).toBe("coverage");
  });

  it("falls back to curated (flagged) when there's no coverage", () => {
    const r = resolveJournalists([mention({ channel: "social" })], curated, 8, NOW);
    expect(r.live).toBe(false);
    expect(r.journalists[0]).toMatchObject({ name: "A. Rivera", provider: "curated" });
  });
});
