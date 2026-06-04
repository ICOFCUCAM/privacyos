import { describe, it, expect } from "vitest";
import { planInclusions, cardInclusions } from "./inclusions";

const get = (planId: string, label: string) => planInclusions(planId).find((i) => i.label === label)!;

describe("planInclusions", () => {
  it("derives the free tier: limited removals, no credit, no suites", () => {
    expect(get("free", "Data-broker removals")).toMatchObject({ detail: "10", included: true });
    expect(get("free", "Credit monitoring").included).toBe(false);
    expect(get("free", "Reputation defense").included).toBe(false);
  });

  it("gives Premium single-bureau credit + unlimited removals + reputation", () => {
    expect(get("premium", "Credit monitoring")).toMatchObject({ detail: "1-bureau", included: true });
    expect(get("premium", "Data-broker removals").detail).toBe("Unlimited");
    expect(get("premium", "Reputation defense").included).toBe(true);
  });

  it("gives Executive tri-bureau credit + executive protection", () => {
    expect(get("exec-pro", "Credit monitoring")).toMatchObject({ detail: "3-bureau", included: true });
    expect(get("exec-pro", "Executive protection").included).toBe(true);
  });

  it("gives Business tri-bureau credit + org risk", () => {
    expect(get("biz-growth", "Credit monitoring").detail).toBe("3-bureau");
    expect(get("biz-growth", "Business & org risk").included).toBe(true);
  });

  it("marks the Family plan's household seats", () => {
    expect(get("family", "Family protection")).toMatchObject({ detail: "6 seats", included: true });
  });
});

describe("cardInclusions", () => {
  it("returns the three comparable facts in order", () => {
    expect(cardInclusions("exec-pro").map((i) => i.label)).toEqual([
      "Data-broker removals", "Credit monitoring", "Autonomous response engine",
    ]);
  });
});
