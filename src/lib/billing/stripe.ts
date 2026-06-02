/**
 * Minimal Stripe REST client (no SDK dependency).
 *
 * Mirrors the LLM-provider pattern: talks to Stripe over fetch, and is inert
 * when unconfigured (`STRIPE_SECRET_KEY` unset) so the app builds and runs
 * without billing keys. Only the two calls we need — Checkout Sessions and the
 * Billing Portal — are implemented.
 */

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/**
 * Maps a PrivacyOS plan id to its Stripe Price id via env, e.g.
 * STRIPE_PRICE_PLUS, STRIPE_PRICE_REP_CREATOR. When `annual` is requested it
 * prefers the `_ANNUAL` variant (e.g. STRIPE_PRICE_PLUS_ANNUAL) and falls back
 * to the monthly price when no annual price is configured. Returns undefined
 * only when the plan is unmapped entirely.
 */
export function stripePriceId(planId: string, annual = false): string | undefined {
  const base = `STRIPE_PRICE_${planId.toUpperCase().replace(/-/g, "_")}`;
  if (annual) {
    const annualPrice = process.env[`${base}_ANNUAL`];
    if (annualPrice) return annualPrice;
  }
  return process.env[base];
}

async function stripePost(path: string, form: Record<string, string>): Promise<Record<string, unknown>> {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(form).toString(),
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const msg = (data.error as { message?: string } | undefined)?.message ?? `Stripe ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

/** Create a Checkout Session for a subscription; returns the hosted URL. */
export async function createCheckoutSession(opts: {
  priceId: string;
  planId: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  clientReferenceId?: string;
  annual?: boolean;
}): Promise<string> {
  const form: Record<string, string> = {
    mode: "subscription",
    "line_items[0][price]": opts.priceId,
    "line_items[0][quantity]": "1",
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    "metadata[plan_id]": opts.planId,
    "metadata[cadence]": opts.annual ? "annual" : "monthly",
    "subscription_data[metadata][plan_id]": opts.planId,
    allow_promotion_codes: "true",
  };
  if (opts.customerEmail) form.customer_email = opts.customerEmail;
  if (opts.clientReferenceId) form.client_reference_id = opts.clientReferenceId;

  const session = await stripePost("checkout/sessions", form);
  return session.url as string;
}

/** Create a Billing Portal session so customers can manage/cancel. */
export async function createPortalSession(opts: {
  customerId: string;
  returnUrl: string;
}): Promise<string> {
  const session = await stripePost("billing_portal/sessions", {
    customer: opts.customerId,
    return_url: opts.returnUrl,
  });
  return session.url as string;
}
