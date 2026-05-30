/**
 * Entitlements.
 *
 * Pure mapping from a subscription (plan + status) to what a user can access.
 * Used for dashboard plan-gating and limit display. Kept dependency-free and
 * unit-tested so gating decisions are explainable and never depend on IO.
 */

import type { PlanCategory } from "./plans";
import { PLANS } from "./plans";

export type SubscriptionStatus =
  | "trialing" | "active" | "past_due" | "canceled" | "incomplete" | "unpaid" | "none";

export interface Subscription {
  planId: string;
  status: SubscriptionStatus;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
}

/** A status that grants access (paid/granted), vs. lapsed/none. */
export function isEntitled(status: SubscriptionStatus): boolean {
  return status === "active" || status === "trialing" || status === "past_due";
}

/** Feature keys that can be gated in the UI. */
export type Feature =
  | "reputation"
  | "executive"
  | "business"
  | "family"
  | "ai_agent"
  | "deep_web"
  | "priority_support";

export interface Entitlements {
  /** Active plan id, or null when unsubscribed/demo. */
  planId: string | null;
  category: PlanCategory | null;
  entitled: boolean;
  features: Record<Feature, boolean>;
  /** Max data-broker removals; Infinity = unlimited. */
  brokerRemovalLimit: number;
  /** Family member seats. */
  familySeats: number;
}

const NONE: Entitlements = {
  planId: null,
  category: null,
  entitled: false,
  features: {
    reputation: false, executive: false, business: false, family: false,
    ai_agent: false, deep_web: false, priority_support: false,
  },
  brokerRemovalLimit: 0,
  familySeats: 0,
};

/** Per-plan broker-removal allowances (personal tiers). */
const BROKER_LIMITS: Record<string, number> = {
  starter: 10,
  plus: 50,
  premium: Infinity,
  family: Infinity,
};

/**
 * Demo / unauthenticated mode grants full read access so the product stays
 * fully explorable without a subscription. Live gating applies once a real
 * subscription is present.
 */
export const DEMO_ENTITLEMENTS: Entitlements = {
  planId: "demo",
  category: null,
  entitled: true,
  features: {
    reputation: true, executive: true, business: true, family: true,
    ai_agent: true, deep_web: true, priority_support: true,
  },
  brokerRemovalLimit: Infinity,
  familySeats: 6,
};

/** Resolve entitlements from a subscription (or null → unsubscribed). */
export function entitlementsFor(sub: Subscription | null): Entitlements {
  if (!sub || !isEntitled(sub.status)) return NONE;
  const plan = PLANS.find((p) => p.id === sub.planId);
  if (!plan) return NONE;

  const cat = plan.category;
  const personalTier = cat === "personal" ? sub.planId : null;

  return {
    planId: plan.id,
    category: cat,
    entitled: true,
    features: {
      reputation: cat === "reputation",
      executive: cat === "executive",
      business: cat === "business",
      // Family/deep-web are personal-tier perks (Premium & Family).
      family: cat === "personal" && (sub.planId === "premium" || sub.planId === "family"),
      deep_web: cat === "personal" && (sub.planId === "premium" || sub.planId === "family"),
      // AI agent is an add-on category, also bundled with higher tiers.
      ai_agent: cat === "ai_addon" || ["plus", "premium", "family"].includes(sub.planId),
      priority_support: ["premium", "family"].includes(sub.planId) ||
        ["executive", "business"].includes(cat),
    },
    brokerRemovalLimit: personalTier ? (BROKER_LIMITS[personalTier] ?? 0) : Infinity,
    familySeats: sub.planId === "family" ? 6 : 1,
  };
}
