import { describe, it, expect } from "vitest";
import { reputationOverview, analysisScores, monitoringCoverage } from "./analysis";
import type { Mention, SentimentLabel } from "@/lib/suite-types";

const mention = (sentiment: SentimentLabel, over: Partial<Mention> = {}): Mention => ({
  id: Math.random().toString(36).slice(2), subjectId: "s1", channel: "search", sourceName: "Example",
  title: "t", excerpt: "e", sentiment,
  sentimentScore: sentiment === "positive" ? 0.8 : sentiment === "negative" ? -0.8 : 0,
  isDefamatory: false, detectedAt: "2026-01-01T00:00:00Z", ...over,
});

describe("reputation overview", () => {
  it("scores higher health for positive coverage than negative", () => {
    const positive = reputationOverview([mention("positive"), mention("positive"), mention("positive")]);
    const negative = reputationOverview([mention("negative"), mention("negative"), mention("negative")]);
    expect(positive.health).toBeGreaterThan(negative.health);
    expect(positive.health).toBeGreaterThanOrEqual(0);
    expect(positive.health).toBeLessThanOrEqual(100);
  });

  it("counts negatives and defamation", () => {
    const o = reputationOverview([
      mention("negative"),
      mention("negative", { isDefamatory: true }),
      mention("positive"),
    ]);
    expect(o.negatives).toBe(2);
    expect(o.defamation).toBe(1);
    expect(o.channelsMonitored).toBeGreaterThan(0);
  });

  it("analysisScores stays within 0–100 and coverage spans channels", () => {
    const s = analysisScores([mention("positive"), mention("negative", { channel: "news" })]);
    for (const v of Object.values(s)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
    expect(monitoringCoverage([mention("positive")]).length).toBeGreaterThan(0);
  });

  it("an empty footprint is neutral, not crashing", () => {
    const o = reputationOverview([]);
    expect(o.negatives).toBe(0);
    expect(o.defamation).toBe(0);
    expect(o.health).toBeGreaterThanOrEqual(0);
  });
});
