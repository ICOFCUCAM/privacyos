import { describe, it, expect } from "vitest";
import { demoScoreHistory } from "./scores";

describe("demo score history", () => {
  it("returns a series per score kind with ordered points", () => {
    const series = demoScoreHistory();
    expect(series.length).toBeGreaterThan(0);
    for (const s of series) {
      expect(s.points.length).toBeGreaterThan(1);
      for (const p of s.points) {
        expect(p.value).toBeGreaterThanOrEqual(0);
        expect(p.value).toBeLessThanOrEqual(100);
        expect(typeof p.date).toBe("string");
      }
    }
  });

  it("is deterministic", () => {
    expect(JSON.stringify(demoScoreHistory())).toBe(JSON.stringify(demoScoreHistory()));
  });
});
