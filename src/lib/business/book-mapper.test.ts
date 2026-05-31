import { describe, it, expect } from "vitest";
import { rowToAccount, rowsToBook, type SubscriptionRow } from "./book-mapper";
import { mrr } from "./saas-metrics";

const row = (over: Partial<SubscriptionRow>): SubscriptionRow => ({
  id: Math.random().toString(36).slice(2),
  plan_id: "plus",
  status: "active",
  created_at: new Date("2025-01-01").toISOString(),
  ...over,
});

describe("rowToAccount", () => {
  it("derives MRR and category from the plan catalog", () => {
    const a = rowToAccount(row({ plan_id: "biz-growth", status: "active" }))!;
    expect(a.mrr).toBe(2999);
    expect(a.category).toBe("business");
    expect(a.contractType).toBe("annual"); // business = enterprise annual
  });

  it("maps personal plans to monthly self-serve contracts", () => {
    const a = rowToAccount(row({ plan_id: "starter" }))!;
    expect(a.contractType).toBe("monthly");
    expect(a.mrr).toBe(14.99);
  });

  it("treats entitled statuses as active and lapsed as churned", () => {
    expect(rowToAccount(row({ status: "active" }))!.status).toBe("active");
    expect(rowToAccount(row({ status: "trialing" }))!.status).toBe("trialing");
    expect(rowToAccount(row({ status: "canceled" }))!.status).toBe("churned");
    expect(rowToAccount(row({ status: "none" }))!.status).toBe("churned");
  });

  it("returns null for unknown plan ids", () => {
    expect(rowToAccount(row({ plan_id: "bogus" }))).toBeNull();
  });

  it("falls back to a high floor price for custom (null-priced) plans", () => {
    const a = rowToAccount(row({ plan_id: "ai-enterprise" }))!;
    expect(a.mrr).toBe(25000);
  });
});

describe("rowsToBook", () => {
  it("drops unknown plans and computes MRR over the survivors", () => {
    const book = rowsToBook([
      row({ plan_id: "plus", status: "active" }),
      row({ plan_id: "bogus", status: "active" }),
      row({ plan_id: "premium", status: "active" }),
    ]);
    expect(book).toHaveLength(2);
    expect(mrr(book)).toBe(29.99 + 49.99);
  });
});
