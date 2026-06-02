/**
 * Subscription reader + entitlement resolution for the current request.
 *
 * Live-aware like the rest of the data layer: reads the user's `subscriptions`
 * row when signed in, otherwise returns demo entitlements so the product stays
 * fully explorable. Never throws — billing must not break the dashboard.
 */

import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  ADMIN_ENTITLEMENTS,
  DEMO_ENTITLEMENTS,
  FREE_ENTITLEMENTS,
  entitlementsFor,
  isAdminEmail,
  type Entitlements,
  type Subscription,
} from "./entitlements";

export async function getSubscription(): Promise<Subscription | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const db = await getSupabaseServerClient();
    if (!db) return null;
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) return null;

    const { data, error } = await db
      .from("subscriptions")
      .select("plan_id,status,current_period_end,cancel_at_period_end")
      .maybeSingle();
    if (error || !data) return null;

    return {
      planId: data.plan_id,
      status: data.status,
      currentPeriodEnd: data.current_period_end ?? undefined,
      cancelAtPeriodEnd: data.cancel_at_period_end ?? undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Entitlements for the current viewer. Demo/unauthenticated → full access so
 * the dashboard is explorable; live signed-in users get plan-based gating.
 */
export async function getEntitlements(): Promise<Entitlements> {
  if (!isSupabaseConfigured()) return DEMO_ENTITLEMENTS;
  const db = await getSupabaseServerClient();
  if (!db) return DEMO_ENTITLEMENTS;
  try {
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) return DEMO_ENTITLEMENTS;
    // Admins (PRIVACYOS_ADMIN_EMAILS allowlist) get full access to every suite.
    if (isAdminEmail(user.email)) return ADMIN_ENTITLEMENTS;
  } catch {
    return DEMO_ENTITLEMENTS;
  }
  const sub = await getSubscription();
  const ent = entitlementsFor(sub);
  // Signed in but no active paid plan (or canceled) → the real free tier
  // (one scan + 10 removals, read-only), never zero access.
  return ent.entitled ? ent : FREE_ENTITLEMENTS;
}
