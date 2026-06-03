import { describe, it, expect } from "vitest";
import { socialStrategies } from "./social";
import type { Mention, SentimentLabel } from "@/lib/suite-types";

const mention = (sentiment: SentimentLabel): Mention => ({
  id: Math.random().toString(36).slice(2), subjectId: "s1", channel: "social", sourceName: "X",
  title: "t", excerpt: "e", sentiment, sentimentScore: sentiment === "negative" ? -0.6 : 0.6,
  isDefamatory: false, detectedAt: "2026-01-01T00:00:00Z",
});

describe("reputation social engine", () => {
  it("returns a strategy per platform", () => {
    const strategies = socialStrategies([mention("positive"), mention("negative")]);
    expect(strategies.length).toBeGreaterThan(0);
    for (const s of strategies) {
      expect(s.platform.length).toBeGreaterThan(0);
    }
  });

  it("handles an empty footprint", () => {
    expect(Array.isArray(socialStrategies([]))).toBe(true);
  });
});
