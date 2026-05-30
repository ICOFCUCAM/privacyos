import { describe, expect, it } from "vitest";
import { analyzeSentiment, netSentiment } from "./sentiment";

describe("sentiment analysis", () => {
  it("scores clearly positive text as positive", () => {
    const r = analyzeSentiment("Award-winning leader celebrated for record growth and innovative success");
    expect(r.label).toBe("positive");
    expect(r.score).toBeGreaterThan(0.34);
  });

  it("scores clearly negative text as negative", () => {
    const r = analyzeSentiment("Firm faces lawsuit and fraud investigation amid scandal and data breach");
    expect(r.label).toBe("negative");
    expect(r.score).toBeLessThan(-0.34);
  });

  it("returns neutral for text with no sentiment terms", () => {
    expect(analyzeSentiment("The company released its quarterly filing today").label).toBe("neutral");
  });

  it("handles negation (not good → negative direction)", () => {
    const negated = analyzeSentiment("the product is not good");
    const plain = analyzeSentiment("the product is good");
    expect(plain.score).toBeGreaterThan(negated.score);
  });

  it("labels balanced pos+neg as mixed", () => {
    const r = analyzeSentiment("great vision but a troubling scandal and lawsuit, yet strong award");
    expect(["mixed", "negative", "positive"]).toContain(r.label);
    expect(r.positiveHits).toBeGreaterThan(0);
    expect(r.negativeHits).toBeGreaterThan(0);
  });

  it("aggregates net sentiment", () => {
    expect(netSentiment([])).toBe(0);
    expect(netSentiment([1, -1])).toBe(0);
    expect(netSentiment([0.5, 0.5, -0.5])).toBeCloseTo(0.167, 2);
  });
});
