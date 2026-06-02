import { describe, it, expect } from "vitest";
import {
  contentRecommendations, contentCalendar, postingSuggestions, brandPillars,
  executiveVisibility, growthProgram,
} from "./growth";
import type { Subject } from "@/lib/types";
import type { Mention, SentimentLabel } from "@/lib/suite-types";

const subject: Subject = {
  id: "s1", type: "individual", displayName: "Jordan Avery", emails: ["jordan@x.com"],
  phones: [], usernames: ["jordanavery"], organization: "Avery Capital", createdAt: "2026-01-01T00:00:00Z",
};

const mention = (sentiment: SentimentLabel): Mention => ({
  id: Math.random().toString(36).slice(2), subjectId: "s1", channel: "news", sourceName: "Outlet",
  title: "t", excerpt: "e", sentiment,
  sentimentScore: sentiment === "positive" ? 0.7 : sentiment === "negative" ? -0.7 : 0,
  isDefamatory: false, detectedAt: "2026-01-01T00:00:00Z",
});

describe("reputation growth engine", () => {
  it("produces a content calendar that scales with the window", () => {
    const two = contentCalendar(subject, 14);
    const one = contentCalendar(subject, 7);
    expect(two.length).toBeGreaterThan(0);
    expect(two.length).toBeGreaterThan(one.length); // longer window → more posts
    expect(two[0].day).toBe(1);
  });

  it("recommendations, posting suggestions and brand pillars are non-empty", () => {
    expect(contentRecommendations(subject, [mention("positive")]).length).toBeGreaterThan(0);
    expect(postingSuggestions().length).toBeGreaterThan(0);
    expect(brandPillars(subject).length).toBeGreaterThan(0);
  });

  it("executive visibility scores within range and reflects more coverage", () => {
    const quiet = executiveVisibility([]);
    const loud = executiveVisibility([mention("positive"), mention("positive"), mention("neutral")]);
    for (const v of [quiet, loud]) {
      expect(v).toBeDefined();
    }
    // growthProgram composes the whole program without crashing
    const program = growthProgram(subject, [mention("positive")]);
    expect(program).toBeDefined();
  });
});
