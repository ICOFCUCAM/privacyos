import { describe, expect, it } from "vitest";
import {
  annualMonthly,
  annualTotal,
  CATEGORY_ORDER,
  PLANS,
  plansByCategory,
} from "./plans";

describe("plan catalog", () => {
  it("applies a 20% annual discount to the monthly price", () => {
    expect(annualMonthly(100)).toBe(80);
    expect(annualMonthly(49.99)).toBe(39.99);
  });

  it("annual total is the discounted monthly times twelve, rounded", () => {
    expect(annualTotal(100)).toBe(960);
    expect(annualTotal(999)).toBe(Math.round(annualMonthly(999) * 12));
  });

  it("has unique plan ids", () => {
    const ids = PLANS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("covers every category and the expected tier counts", () => {
    expect(plansByCategory("personal")).toHaveLength(5); // free + starter/plus/premium/family
    expect(plansByCategory("personal").some((p) => p.id === "free" && p.monthly === 0)).toBe(true);
    expect(plansByCategory("reputation")).toHaveLength(3);
    expect(plansByCategory("executive")).toHaveLength(3);
    expect(plansByCategory("business")).toHaveLength(4);
    expect(plansByCategory("ai_addon")).toHaveLength(3);
    for (const c of CATEGORY_ORDER) expect(plansByCategory(c).length).toBeGreaterThan(0);
  });

  it("each category has exactly one featured tier (except custom-only)", () => {
    for (const c of ["personal", "reputation", "executive", "business", "ai_addon"] as const) {
      const featured = plansByCategory(c).filter((p) => p.featured);
      expect(featured.length).toBeLessThanOrEqual(1);
    }
  });

  it("custom-priced plans use null monthly", () => {
    const custom = PLANS.find((p) => p.id === "ai-enterprise");
    expect(custom?.monthly).toBeNull();
  });
});
