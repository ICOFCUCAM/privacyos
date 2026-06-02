import { describe, it, expect } from "vitest";
import { protectionTier, tierLens, TIER_LENS } from "./tiers";

describe("protection tier lens", () => {
  it("maps plan ids to tiers", () => {
    expect(protectionTier("starter")).toBe("personal");
    expect(protectionTier("plus")).toBe("personal");
    expect(protectionTier("rep-creator")).toBe("professional");
    expect(protectionTier("exec-pro")).toBe("executive");
    expect(protectionTier("biz-growth")).toBe("business");
    expect(protectionTier(null)).toBe("personal");
    expect(protectionTier(undefined)).toBe("personal");
  });

  it("every tier has a lens card with a dashboard link + cta", () => {
    for (const t of ["personal", "professional", "executive", "business"] as const) {
      const lens = TIER_LENS[t];
      expect(lens.tier).toBe(t);
      expect(lens.href.startsWith("/dashboard/")).toBe(true);
      expect(lens.title.length).toBeGreaterThan(0);
      expect(lens.cta.length).toBeGreaterThan(0);
    }
  });

  it("tierLens resolves from a plan id", () => {
    expect(tierLens("exec-elite").href).toBe("/dashboard/executive");
    expect(tierLens("biz-startup").href).toBe("/dashboard/mission-control");
  });
});
