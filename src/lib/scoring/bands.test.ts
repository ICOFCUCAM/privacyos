import { describe, it, expect } from "vitest";
import { riskLevelFromScore, riskBandIndex, protectionBand } from "./bands";

describe("canonical scoring bands", () => {
  it("maps risk scores to levels at the canonical cut points", () => {
    expect(riskLevelFromScore(0)).toBe("low");
    expect(riskLevelFromScore(24)).toBe("low");
    expect(riskLevelFromScore(25)).toBe("medium");
    expect(riskLevelFromScore(49)).toBe("medium");
    expect(riskLevelFromScore(50)).toBe("high");
    expect(riskLevelFromScore(74)).toBe("high");
    expect(riskLevelFromScore(75)).toBe("critical");
    expect(riskLevelFromScore(100)).toBe("critical");
  });

  it("risk band index is monotonic", () => {
    expect(riskBandIndex(10)).toBe(0);
    expect(riskBandIndex(30)).toBe(1);
    expect(riskBandIndex(60)).toBe(2);
    expect(riskBandIndex(90)).toBe(3);
  });

  it("protection bands invert (higher = safer)", () => {
    expect(protectionBand(95)).toBe("secure");
    expect(protectionBand(85)).toBe("secure");
    expect(protectionBand(70)).toBe("protected");
    expect(protectionBand(50)).toBe("fair");
    expect(protectionBand(40)).toBe("exposed");
  });
});
