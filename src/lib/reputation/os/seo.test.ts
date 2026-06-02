import { describe, it, expect } from "vitest";
import { seoProfile, keywordRanks, pageOneDominance } from "./seo";
import type { Subject } from "@/lib/types";
import type { Mention, SentimentLabel } from "@/lib/suite-types";

const subject: Subject = {
  id: "s1", type: "individual", displayName: "Jordan Avery", emails: ["jordan@x.com"],
  phones: [], usernames: ["jordanavery"], organization: "Avery Capital", createdAt: "2026-01-01T00:00:00Z",
};

const mention = (sentiment: SentimentLabel, rank: number): Mention => ({
  id: Math.random().toString(36).slice(2), subjectId: "s1", channel: "search", sourceName: "Result",
  title: "t", excerpt: "e", sentiment,
  sentimentScore: sentiment === "positive" ? 0.7 : sentiment === "negative" ? -0.7 : 0,
  searchRank: rank, isDefamatory: false, detectedAt: "2026-01-01T00:00:00Z",
});

describe("reputation SEO engine", () => {
  it("produces keyword ranks for the subject", () => {
    const ranks = keywordRanks(subject);
    expect(ranks.length).toBeGreaterThan(0);
    for (const k of ranks) {
      expect(k.rank).toBeGreaterThanOrEqual(1);
      expect(k.target).toBeGreaterThanOrEqual(1);
    }
  });

  it("scores page-one dominance from positive vs negative results", () => {
    const dom = pageOneDominance(subject, [mention("positive", 1), mention("positive", 2), mention("negative", 3)]);
    expect(dom.dominance).toBeGreaterThanOrEqual(0);
    expect(dom.dominance).toBeLessThanOrEqual(100);
    expect(dom.positive + dom.negative).toBeLessThanOrEqual(dom.slots.length);
  });

  it("seoProfile composes a 0–100 health and never crashes on empty input", () => {
    const profile = seoProfile(subject, []);
    expect(profile.health).toBeGreaterThanOrEqual(0);
    expect(profile.health).toBeLessThanOrEqual(100);
    expect(profile.keywords.length).toBeGreaterThan(0);
    expect(Array.isArray(profile.competitive)).toBe(true);
  });
});
