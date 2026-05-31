import { describe, it, expect } from "vitest";
import {
  arpu, arr, activeLogos, enterpriseBook, magicNumber, mrr, mrrMovement,
  retention, revenueByCategory, unitEconomics,
} from "./saas-metrics";
import { demoBook } from "./book";
import type { Account } from "./saas-metrics";
import type { PlanCategory } from "@/lib/billing/plans";

const iso = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();

function acct(over: Partial<Account>): Account {
  return {
    id: Math.random().toString(36).slice(2),
    planId: "plus",
    category: "personal",
    seats: 1,
    status: "active",
    mrr: 100,
    startedAt: iso(60),
    acquisitionCost: 200,
    contractType: "monthly",
    expansionMrr: 0,
    ...over,
  };
}

describe("core revenue", () => {
  it("sums MRR/ARR from active accounts only", () => {
    const book = [acct({ mrr: 100 }), acct({ mrr: 200 }), acct({ mrr: 999, status: "churned" })];
    expect(mrr(book)).toBe(300);
    expect(arr(book)).toBe(3600);
    expect(activeLogos(book)).toBe(2);
  });

  it("computes ARPU over active accounts", () => {
    const book = [acct({ mrr: 100 }), acct({ mrr: 300 })];
    expect(arpu(book)).toBe(200);
  });

  it("handles an empty book without NaN", () => {
    expect(mrr([])).toBe(0);
    expect(arpu([])).toBe(0);
  });
});

describe("retention", () => {
  it("yields NRR > 100% when expansion outweighs churn", () => {
    const book = [
      acct({ mrr: 120, expansionMrr: 20 }), // started at 100, expanded +20
      acct({ mrr: 100, expansionMrr: 0 }),
    ];
    const r = retention(book);
    // base = 200, +20 expansion, no churn → 110%
    expect(r.nrr).toBe(110);
    expect(r.grr).toBe(100);
    expect(r.expansionMrr).toBe(20);
    expect(r.logoChurn).toBe(0);
  });

  it("drops GRR and NRR when accounts churn", () => {
    const book = [
      acct({ mrr: 100, expansionMrr: 0 }),
      acct({ mrr: 100, status: "churned", churnedAt: iso(5) }),
    ];
    const r = retention(book);
    // base = 100 active-start + 100 churned = 200; churn 100 → grr 50%
    expect(r.grr).toBe(50);
    expect(r.nrr).toBe(50);
    expect(r.churnedMrr).toBe(100);
    expect(r.logoRetention).toBe(50);
    expect(r.logoChurn).toBe(50);
  });
});

describe("unit economics", () => {
  it("computes CAC across all logos ever acquired", () => {
    const book = [acct({ acquisitionCost: 100 }), acct({ acquisitionCost: 300, status: "churned", churnedAt: iso(3) })];
    const ue = unitEconomics(book);
    expect(ue.cac).toBe(200);
  });

  it("produces a positive LTV:CAC and payback", () => {
    const book = demoBook();
    const ue = unitEconomics(book);
    expect(ue.ltv).toBeGreaterThan(0);
    expect(ue.cac).toBeGreaterThan(0);
    expect(ue.ltvToCac).toBeGreaterThan(0);
    expect(ue.paybackMonths).toBeGreaterThan(0);
  });
});

describe("magicNumber", () => {
  it("is net-new-ARR over S&M spend", () => {
    expect(magicNumber(1000, 500)).toBe(2);
    expect(magicNumber(1000, 0)).toBe(0);
  });
});

describe("revenueByCategory & enterprise book", () => {
  const labels: Record<PlanCategory, string> = {
    personal: "Personal", reputation: "ReputationOS", executive: "ExecutiveOS",
    business: "BusinessOS", ai_addon: "AI Agents",
  };

  it("ranks categories by MRR with shares summing sensibly", () => {
    const rev = revenueByCategory(demoBook(), labels);
    expect(rev.length).toBeGreaterThan(0);
    expect(rev[0].mrr).toBeGreaterThanOrEqual(rev[rev.length - 1].mrr);
    const totalShare = rev.reduce((s, r) => s + r.share, 0);
    expect(totalShare).toBeGreaterThan(90);
    expect(totalShare).toBeLessThanOrEqual(101);
  });

  it("counts annual contracts as the enterprise book", () => {
    const eb = enterpriseBook(demoBook());
    expect(eb.contracts).toBeGreaterThan(0);
    expect(eb.acv).toBeGreaterThan(0);
    expect(eb.averageAcv).toBeGreaterThan(0);
    expect(eb.mrrShare).toBeGreaterThan(0);
  });
});

describe("mrrMovement", () => {
  it("splits new / expansion / churn within the trailing 30 days", () => {
    const book = [
      acct({ mrr: 100, expansionMrr: 0, startedAt: iso(5) }), // new
      acct({ mrr: 120, expansionMrr: 20, startedAt: iso(200) }), // expansion only
      acct({ mrr: 80, status: "churned", churnedAt: iso(10) }), // churn
    ];
    const m = mrrMovement(book);
    expect(m.newMrr).toBe(100);
    expect(m.expansionMrr).toBe(20);
    expect(m.churnedMrr).toBe(80);
    expect(m.netNewMrr).toBe(40);
  });
});

describe("demoBook integrity", () => {
  it("produces a realistic, non-trivial book", () => {
    const book = demoBook();
    expect(book.length).toBeGreaterThan(15);
    expect(mrr(book)).toBeGreaterThan(0);
    // every account's MRR ties to base + expansion
    for (const a of book) {
      expect(a.mrr).toBeGreaterThanOrEqual(a.expansionMrr);
    }
  });
});
