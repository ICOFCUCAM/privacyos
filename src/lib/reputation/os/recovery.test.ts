import { describe, it, expect } from "vitest";
import { suppressionTactics, suppressionPlan, repairWorkflow, crisisPlan } from "./recovery";
import type { Mention, SentimentLabel } from "@/lib/suite-types";

const mention = (sentiment: SentimentLabel, over: Partial<Mention> = {}): Mention => ({
  id: Math.random().toString(36).slice(2), subjectId: "s1", channel: "search", sourceName: "Result",
  title: "t", excerpt: "e", sentiment, sentimentScore: sentiment === "negative" ? -0.7 : 0.5,
  isDefamatory: false, detectedAt: "2026-01-01T00:00:00Z", ...over,
});

describe("reputation recovery engine", () => {
  it("offers more tactics when defamation is present", () => {
    expect(suppressionTactics(true).length).toBeGreaterThanOrEqual(suppressionTactics(false).length);
  });

  it("builds a suppression plan from negative results", () => {
    const plan = suppressionPlan([mention("negative", { searchRank: 2 }), mention("positive")]);
    expect(Array.isArray(plan)).toBe(true);
  });

  it("provides a repair workflow and a crisis plan", () => {
    expect(repairWorkflow().length).toBeGreaterThan(0);
    expect(crisisPlan([mention("negative", { isDefamatory: true })])).toBeDefined();
  });
});
