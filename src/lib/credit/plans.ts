/**
 * Credit-monitoring tiers by plan.
 *
 * Credit monitoring is a paid capability with *levels* — the price plan decides
 * how many bureaus are covered and how often automated checks may run. Checks
 * default to MANUAL on every tier (a credit pull costs money, so we never pull
 * on the customer's behalf until they opt in); when they enable auto, the cadence
 * here caps how often the scheduler pulls, keeping the system cost-efficient.
 *
 * Pure + unit-tested.
 */

import { PLANS } from "@/lib/billing/plans";

export type CreditLevel = "none" | "basic" | "full";

export interface CreditPlan {
  level: CreditLevel;
  label: string;
  /** Bureaus covered (0 = not included). */
  bureaus: 0 | 1 | 3;
  /** Whether automated (scheduled) checks are available at all on this tier. */
  autoAvailable: boolean;
  /** Minimum days between automated pulls — the cost cap. 0 = n/a. */
  autoCadenceDays: number;
}

const NONE: CreditPlan = { level: "none", label: "Not included", bureaus: 0, autoAvailable: false, autoCadenceDays: 0 };
const BASIC: CreditPlan = { level: "basic", label: "Single-bureau monitoring", bureaus: 1, autoAvailable: true, autoCadenceDays: 30 };
const FULL: CreditPlan = { level: "full", label: "Tri-bureau monitoring", bureaus: 3, autoAvailable: true, autoCadenceDays: 7 };

/** Resolve the credit tier for a plan id. */
export function creditPlanFor(planId?: string | null): CreditPlan {
  if (!planId) return NONE;
  if (planId === "demo" || planId === "admin") return FULL;
  const plan = PLANS.find((p) => p.id === planId);
  if (!plan) return NONE;
  if (plan.category === "executive" || plan.category === "business") return FULL;
  if (plan.category === "personal" && (planId === "premium" || planId === "family")) return BASIC;
  return NONE;
}

/** True when an automated pull is due given the tier's cadence and the last check. */
export function creditCheckDue(plan: CreditPlan, lastCheckedAt: string | null | undefined, now: number = Date.now()): boolean {
  if (!plan.autoAvailable) return false;
  if (!lastCheckedAt) return true;
  const last = Date.parse(lastCheckedAt);
  if (!Number.isFinite(last)) return true;
  return now - last >= plan.autoCadenceDays * 86_400_000;
}
