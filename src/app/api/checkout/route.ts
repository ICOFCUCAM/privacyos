import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/billing/plans";
import {
  createCheckoutSession,
  isStripeConfigured,
  stripePriceId,
} from "@/lib/billing/stripe";

/**
 * POST /api/checkout — start a Stripe Checkout session for a plan.
 *
 * Body: { planId: string, annual?: boolean }. Requires Stripe configured, the
 * plan mapped to a Stripe Price (STRIPE_PRICE_<ID>), and a signed-in user.
 * Returns { url } to redirect to Stripe's hosted checkout.
 */
async function origin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Billing is not configured." }, { status: 503 });
  }

  let planId = "";
  try {
    ({ planId } = await req.json());
  } catch {
    /* no body */
  }
  const plan = PLANS.find((p) => p.id === planId);
  if (!plan) return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
  if (plan.monthly === null) {
    return NextResponse.json({ error: "This plan is sales-assisted; contact sales." }, { status: 400 });
  }

  const priceId = stripePriceId(plan.id);
  if (!priceId) {
    return NextResponse.json(
      { error: `No Stripe price mapped for ${plan.id} (set STRIPE_PRICE_${plan.id.toUpperCase().replace(/-/g, "_")}).` },
      { status: 400 },
    );
  }

  const supabase = await getSupabaseServerClient();
  const { data } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  const user = data?.user;
  if (!user) {
    return NextResponse.json({ error: "Sign in to subscribe." }, { status: 401 });
  }

  const base = await origin();
  try {
    const url = await createCheckoutSession({
      priceId,
      planId: plan.id,
      successUrl: `${base}/dashboard?checkout=success`,
      cancelUrl: `${base}/pricing?checkout=cancelled`,
      customerEmail: user.email ?? undefined,
      clientReferenceId: user.id,
    });
    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
