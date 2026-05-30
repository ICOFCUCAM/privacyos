"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createPortalSession, isStripeConfigured } from "@/lib/billing/stripe";

/** Open the Stripe Billing Portal for the current user's customer. */
export async function openBillingPortal(): Promise<void> {
  if (!isStripeConfigured()) redirect("/dashboard/settings?billing=unconfigured");

  const db = await getSupabaseServerClient();
  if (!db) redirect("/dashboard/settings");
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await db
    .from("subscriptions")
    .select("stripe_customer_id")
    .maybeSingle();
  const customerId = data?.stripe_customer_id;
  if (!customerId) redirect("/pricing");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? `${proto}://${host}`;

  const url = await createPortalSession({ customerId, returnUrl: `${base}/dashboard/settings` });
  redirect(url);
}
