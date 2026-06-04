import { describe, it, expect } from "vitest";
import { creditPlanFor, creditCheckDue } from "./plans";

describe("creditPlanFor", () => {
  it("gives no credit monitoring to free/entry tiers", () => {
    expect(creditPlanFor("free").level).toBe("none");
    expect(creditPlanFor("starter").level).toBe("none");
    expect(creditPlanFor("plus").level).toBe("none");
    expect(creditPlanFor(null).level).toBe("none");
  });

  it("gives single-bureau to Premium/Family, tri-bureau to Executive/Business", () => {
    expect(creditPlanFor("premium")).toMatchObject({ level: "basic", bureaus: 1, autoCadenceDays: 30 });
    expect(creditPlanFor("family").level).toBe("basic");
    expect(creditPlanFor("exec-pro")).toMatchObject({ level: "full", bureaus: 3, autoCadenceDays: 7 });
    expect(creditPlanFor("biz-growth").level).toBe("full");
  });

  it("full access for demo/admin", () => {
    expect(creditPlanFor("demo").level).toBe("full");
    expect(creditPlanFor("admin").level).toBe("full");
  });
});

describe("creditCheckDue", () => {
  const full = creditPlanFor("exec-pro"); // 7-day cadence
  const now = Date.parse("2026-06-10T00:00:00Z");

  it("is due when never checked", () => {
    expect(creditCheckDue(full, null, now)).toBe(true);
  });

  it("respects the cadence cap", () => {
    expect(creditCheckDue(full, "2026-06-09T00:00:00Z", now)).toBe(false); // 1 day < 7
    expect(creditCheckDue(full, "2026-06-01T00:00:00Z", now)).toBe(true); // 9 days >= 7
  });

  it("never due on a tier without auto", () => {
    expect(creditCheckDue(creditPlanFor("free"), null, now)).toBe(false);
  });
});
