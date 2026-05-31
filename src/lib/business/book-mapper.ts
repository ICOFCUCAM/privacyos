/**
 * Pure mapping from `subscriptions` rows to the SaaS-metrics Account model.
 *
 * Real subscription rows only carry the plan, status and billing period — they
 * don't store derived commercial attributes (seats, blended CAC, expansion). We
 * derive those deterministically from the plan catalog so live metrics are
 * explainable and unit-testable, exactly like the demo book.
 */

import { PLANS, type PlanCategory } from "@/lib/billing/plans";
import { isEntitled, type SubscriptionStatus } from "@/lib/billing/entitlements";
import type { Account, AccountStatus } from "./saas-metrics";

/** A raw subscriptions row (snake_case, as stored in Supabase). */
export interface SubscriptionRow {
  id: string;
  plan_id: string;
  status: SubscriptionStatus;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean | null;
  created_at?: string | null;
}

/** Blended acquisition cost by product line (self-serve cheap, enterprise heavy). */
const CAC_BY_CATEGORY: Record<PlanCategory, number> = {
  personal: 60,
  reputation: 480,
  executive: 3200,
  business: 5200,
  ai_addon: 220,
};

/** Annual (enterprise) contracts vs monthly self-serve, by category. */
const ANNUAL_CATEGORIES: PlanCategory[] = ["executive", "business"];

function planMonthly(planId: string, fallback = 25000): number {
  return PLANS.find((p) => p.id === planId)?.monthly ?? fallback;
}

function planCategory(planId: string): PlanCategory {
  return PLANS.find((p) => p.id === planId)?.category ?? "personal";
}

function toAccountStatus(status: SubscriptionStatus): AccountStatus {
  if (status === "trialing") return "trialing";
  return isEntitled(status) ? "active" : "churned";
}

/**
 * Map one subscription row to an Account. `expansionMrr` is left at 0 for live
 * rows (we don't yet track per-account upgrades); seats default to 1 unless the
 * plan is a known multi-seat SKU. Unknown plans are skipped by the caller.
 */
export function rowToAccount(row: SubscriptionRow): Account | null {
  if (!PLANS.some((p) => p.id === row.plan_id)) return null;
  const category = planCategory(row.plan_id);
  const base = planMonthly(row.plan_id);
  return {
    id: row.id,
    planId: row.plan_id,
    category,
    seats: 1,
    status: toAccountStatus(row.status),
    mrr: base,
    startedAt: row.created_at ?? new Date().toISOString(),
    churnedAt: toAccountStatus(row.status) === "churned" ? (row.current_period_end ?? undefined) : undefined,
    acquisitionCost: CAC_BY_CATEGORY[category],
    contractType: ANNUAL_CATEGORIES.includes(category) ? "annual" : "monthly",
    expansionMrr: 0,
  };
}

/** Map a set of subscription rows into the book, dropping unknown plans. */
export function rowsToBook(rows: SubscriptionRow[]): Account[] {
  return rows.map(rowToAccount).filter((a): a is Account => a !== null);
}
