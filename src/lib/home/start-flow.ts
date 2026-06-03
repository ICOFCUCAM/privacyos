/**
 * Start flow — the single activation door's pure decision logic.
 *
 * `/start` is the one link the whole funnel points at: it carries the visitor
 * across the auth boundary and resumes checkout, so a customer goes scan →
 * recommended plan → account → payment → activated without ever backtracking
 * through the pricing grid. This module resolves WHAT should happen; the route
 * handler just executes the result. Pure + unit-tested.
 */

export type StartAction =
  | { kind: "login"; next: string }
  | { kind: "checkout" }
  | { kind: "onboarding" }
  | { kind: "dashboard" }
  | { kind: "pricing" };

export interface StartContext {
  /** Whether a real auth/backend is configured (vs demo mode). */
  supabaseConfigured: boolean;
  /** Whether a user is signed in. */
  authed: boolean;
  /** The requested plan id (may be empty/unknown). */
  planId: string;
  /** The plan's monthly price, or undefined when the plan id is unknown. */
  planMonthly: number | null | undefined;
  /** Whether the plan is wired to Stripe (configured + price mapped). */
  purchasable: boolean;
}

export function resolveStart(ctx: StartContext): StartAction {
  const known = ctx.planMonthly !== undefined;

  // Demo mode (no backend): nothing to buy or onboard — just show the product.
  if (!ctx.supabaseConfigured) {
    return known ? { kind: "dashboard" } : { kind: "pricing" };
  }

  // Auth boundary: bounce through login, but remember exactly where to resume.
  if (!ctx.authed) {
    return { kind: "login", next: known ? `/start?plan=${ctx.planId}` : "/pricing" };
  }

  if (!known) return { kind: "pricing" };

  // Signed in: a paid, wired plan resumes straight to checkout; everything else
  // (the free tier, or a plan not yet wired to Stripe) creates the account and
  // onboards — capturing the customer instead of dead-ending on a config gap.
  const isPaid = typeof ctx.planMonthly === "number" && ctx.planMonthly > 0;
  return isPaid && ctx.purchasable ? { kind: "checkout" } : { kind: "onboarding" };
}
