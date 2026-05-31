/**
 * Book-of-business provider.
 *
 * Returns the set of customer accounts the SaaS-metrics engine runs on. Today
 * this is a deterministic, plan-grounded demo book so the operator console is
 * populated out of the box; when a billing warehouse / Supabase `subscriptions`
 * table is connected, `getBook()` will read real accounts behind the same
 * interface (the live⇄demo seam used elsewhere in the product).
 *
 * The demo book is built from the real plan catalog so every dollar of MRR ties
 * back to an actual SKU — not an invented figure.
 */

import { PLANS, type PlanCategory } from "@/lib/billing/plans";
import type { Account, AccountStatus } from "./saas-metrics";

const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();

function planPrice(planId: string, fallback = 25000): number {
  const p = PLANS.find((x) => x.id === planId);
  return p?.monthly ?? fallback;
}

function planCategory(planId: string): PlanCategory {
  return PLANS.find((x) => x.id === planId)?.category ?? "personal";
}

/**
 * A blended CAC by category — self-serve personal logos are cheap to acquire;
 * enterprise/executive logos carry heavy sales cost.
 */
const CAC_BY_CATEGORY: Record<PlanCategory, number> = {
  personal: 60,
  reputation: 480,
  executive: 3200,
  business: 5200,
  ai_addon: 220,
};

interface Seed {
  planId: string;
  seats: number;
  status: AccountStatus;
  startedDaysAgo: number;
  churnedDaysAgo?: number;
  /** Expansion as a multiple of the base plan price (per-seat / upgrades). */
  expansionMult?: number;
  contractType: "monthly" | "annual";
  /** Optional CAC override. */
  cac?: number;
}

/**
 * Deterministic demo accounts spanning all five product lines. Counts are
 * representative of an early-growth book: a wide self-serve base plus a handful
 * of high-ACV enterprise/executive contracts that carry expansion and a low
 * (but non-zero) churn tail.
 */
const SEED: Seed[] = [
  // Personal self-serve base (high volume, low ACV, some churn)
  ...Array.from({ length: 14 }, (_, i): Seed => ({
    planId: i % 3 === 0 ? "premium" : i % 3 === 1 ? "plus" : "starter",
    seats: 1, status: "active", startedDaysAgo: 30 + i * 9, contractType: "monthly",
    expansionMult: i % 4 === 0 ? 0.4 : 0,
  })),
  { planId: "family", seats: 6, status: "active", startedDaysAgo: 120, contractType: "monthly", expansionMult: 0.2 },
  { planId: "plus", seats: 1, status: "churned", startedDaysAgo: 90, churnedDaysAgo: 12, contractType: "monthly" },
  { planId: "starter", seats: 1, status: "churned", startedDaysAgo: 70, churnedDaysAgo: 40, contractType: "monthly" },

  // ReputationOS (mid ACV)
  { planId: "rep-professional", seats: 1, status: "active", startedDaysAgo: 150, contractType: "monthly", expansionMult: 0.3 },
  { planId: "rep-creator", seats: 1, status: "active", startedDaysAgo: 80, contractType: "monthly", expansionMult: 0.5 },
  { planId: "rep-public-figure", seats: 1, status: "active", startedDaysAgo: 45, contractType: "annual" },

  // ExecutiveOS (high ACV, annual, sticky, expansion via family/team)
  { planId: "exec-essential", seats: 1, status: "active", startedDaysAgo: 200, contractType: "annual", expansionMult: 0.4 },
  { planId: "exec-pro", seats: 1, status: "active", startedDaysAgo: 110, contractType: "annual", expansionMult: 0.6 },
  { planId: "exec-elite", seats: 1, status: "active", startedDaysAgo: 60, contractType: "annual" },

  // BusinessOS (highest ACV, annual, per-seat expansion)
  { planId: "biz-startup", seats: 25, status: "active", startedDaysAgo: 160, contractType: "annual", expansionMult: 0.5 },
  { planId: "biz-growth", seats: 220, status: "active", startedDaysAgo: 95, contractType: "annual", expansionMult: 0.8 },
  { planId: "biz-growth", seats: 180, status: "active", startedDaysAgo: 20, contractType: "annual" },
  { planId: "biz-enterprise", seats: 2100, status: "active", startedDaysAgo: 130, contractType: "annual", expansionMult: 1.1 },
  { planId: "biz-enterprise", seats: 900, status: "churned", startedDaysAgo: 220, churnedDaysAgo: 25, contractType: "annual" },

  // AI add-on attach (rides existing logos, low CAC)
  { planId: "ai-pack", seats: 1, status: "active", startedDaysAgo: 50, contractType: "monthly", expansionMult: 0 },
  { planId: "ai-pro", seats: 1, status: "active", startedDaysAgo: 25, contractType: "monthly", expansionMult: 0 },
];

export function demoBook(): Account[] {
  return SEED.map((s, i): Account => {
    const base = planPrice(s.planId);
    const category = planCategory(s.planId);
    const expansionMrr = Math.round(base * (s.expansionMult ?? 0) * 100) / 100;
    return {
      id: `acct_${i + 1}`,
      planId: s.planId,
      category,
      seats: s.seats,
      status: s.status,
      mrr: Math.round((base + expansionMrr) * 100) / 100,
      startedAt: iso(s.startedDaysAgo),
      churnedAt: s.churnedDaysAgo !== undefined ? iso(s.churnedDaysAgo) : undefined,
      acquisitionCost: s.cac ?? CAC_BY_CATEGORY[category],
      contractType: s.contractType,
      expansionMrr,
    };
  });
}

/**
 * Resolve the active book of business. Demo today; swap to a Supabase-backed
 * reader (real `subscriptions` rows) behind this same signature when the billing
 * warehouse is connected.
 */
export async function getBook(): Promise<{ accounts: Account[]; live: boolean }> {
  return { accounts: demoBook(), live: false };
}
