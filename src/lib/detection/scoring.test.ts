import { describe, it, expect } from "vitest";
import {
  credentialReuseRisk, deepfakeConfidence, detectorAccuracy, editDistance,
  impersonationSimilarity, scoreToLevel,
} from "./scoring";

describe("scoreToLevel", () => {
  it("bands scores into risk levels", () => {
    expect(scoreToLevel(85)).toBe("critical");
    expect(scoreToLevel(65)).toBe("high");
    expect(scoreToLevel(40)).toBe("medium");
    expect(scoreToLevel(10)).toBe("low");
  });
});

describe("deepfakeConfidence", () => {
  it("scores high for strong artifacts + low provenance + synthetic metadata", () => {
    const r = deepfakeConfidence({ artifactScore: 0.95, faceMatch: 0.9, provenanceTrust: 0.1, syntheticMetadata: true });
    expect(r.score).toBeGreaterThan(80);
    expect(r.level).toBe("critical");
    expect(r.factors.reduce((s, f) => s + f.contribution, 0)).toBeGreaterThan(0);
  });

  it("scores low for clean media from a trusted source", () => {
    const r = deepfakeConfidence({ artifactScore: 0.05, faceMatch: 0.2, provenanceTrust: 0.95, syntheticMetadata: false });
    expect(r.score).toBeLessThan(35);
    expect(r.level).toBe("low");
  });
});

describe("editDistance", () => {
  it("computes Levenshtein distance", () => {
    expect(editDistance("paypal", "paypal")).toBe(0);
    expect(editDistance("paypal", "paypa1")).toBe(1);
    expect(editDistance("", "abc")).toBe(3);
  });
});

describe("impersonationSimilarity", () => {
  it("treats an identical handle as benign (score 0)", () => {
    const r = impersonationSimilarity("paypal.com", "paypal.com");
    expect(r.score).toBe(0);
    expect(r.isLookalike).toBe(false);
  });

  it("flags a near-miss look-alike as high risk", () => {
    const r = impersonationSimilarity("paypal.com", "paypaI.com"); // capital I
    expect(r.similarity).toBeGreaterThan(70);
    expect(r.isLookalike).toBe(true);
    expect(r.score).toBeGreaterThan(60);
  });

  it("catches homoglyph spoofing (paypa1 -> paypal)", () => {
    const r = impersonationSimilarity("paypal", "paypa1"); // 1 -> l canonicalization
    expect(r.isLookalike).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(90);
  });

  it("scores an unrelated string low", () => {
    const r = impersonationSimilarity("paypal.com", "totally-different.org");
    expect(r.score).toBeLessThan(40);
  });
});

describe("credentialReuseRisk", () => {
  it("escalates with sensitive classes, reuse and plaintext", () => {
    const r = credentialReuseRisk({ dataClasses: ["Passwords", "SSN"], pwnCount: 1_000_000, reusedElsewhere: true, plaintext: true });
    expect(r.score).toBeGreaterThan(80);
    expect(r.level).toBe("critical");
  });

  it("stays low for a small non-sensitive leak", () => {
    const r = credentialReuseRisk({ dataClasses: ["Email addresses"], pwnCount: 50, reusedElsewhere: false, plaintext: false });
    expect(r.score).toBeLessThan(35);
  });
});

describe("detectorAccuracy", () => {
  it("is the mean of assigned confidences", () => {
    expect(detectorAccuracy({ detector: "deepfake", confidences: [90, 80, 100] })).toBe(90);
    expect(detectorAccuracy({ detector: "x", confidences: [] })).toBe(0);
  });
});
