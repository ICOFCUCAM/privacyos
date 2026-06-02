/**
 * Stripe setup — one command to provision Products & Prices from the PrivacyOS
 * plan catalog, then print the env lines the app expects.
 *
 * Usage (run locally, NOT in CI; needs your Stripe secret key):
 *
 *   STRIPE_SECRET_KEY=sk_test_xxx node scripts/stripe-setup.ts            # monthly prices
 *   STRIPE_SECRET_KEY=sk_test_xxx node scripts/stripe-setup.ts --annual   # + annual prices
 *
 * (Node 22.18+ runs .ts directly. On older Node use:  npx tsx scripts/stripe-setup.ts)
 *
 * Idempotent: re-running reuses existing Products (matched by metadata.plan_id)
 * and Prices (matched by lookup_key), so it never creates duplicates. Paste the
 * printed STRIPE_PRICE_* lines into .env.local (never commit them).
 */

import { PLANS, ANNUAL_DISCOUNT } from "../src/lib/billing/plans.ts";
import { CURRENCIES, toStripeAmount } from "../src/lib/billing/currencies.ts";

const KEY = process.env.STRIPE_SECRET_KEY;
const WANT_ANNUAL = process.argv.includes("--annual");

if (!KEY) {
  console.error("✗ Set STRIPE_SECRET_KEY (sk_test_… for the sandbox) and re-run.");
  process.exit(1);
}
if (KEY.startsWith("sk_live_")) {
  console.error("✗ Refusing to run against a LIVE key by accident. Use a test key (sk_test_…),");
  console.error("  or remove this guard deliberately once you've reviewed the script.");
  process.exit(1);
}

const ENV_KEY = (planId: string) => `STRIPE_PRICE_${planId.toUpperCase().replace(/-/g, "_")}`;

async function stripe(method: "GET" | "POST", path: string, form?: Record<string, string>): Promise<any> {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: {
      authorization: `Bearer ${KEY}`,
      ...(form ? { "content-type": "application/x-www-form-urlencoded" } : {}),
    },
    body: form ? new URLSearchParams(form).toString() : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? `Stripe ${res.status}`);
  return data;
}

/** Find a Product by our plan_id metadata, or create it. */
async function ensureProduct(planId: string, name: string): Promise<string> {
  const list = await stripe("GET", "products?active=true&limit=100");
  const existing = (list.data as any[]).find((p) => p.metadata?.plan_id === planId);
  if (existing) return existing.id;
  const created = await stripe("POST", "products", {
    name,
    "metadata[plan_id]": planId,
  });
  return created.id;
}

/**
 * Find a recurring Price by lookup_key, or create it with a USD base plus
 * `currency_options` for every other presentment currency. Returns the price id.
 */
async function ensurePrice(opts: {
  product: string;
  planId: string;
  lookupKey: string;
  usdDollars: number;
  interval: "month" | "year";
  nickname: string;
}): Promise<string> {
  const found = await stripe("GET", `prices?lookup_keys[]=${encodeURIComponent(opts.lookupKey)}&limit=1`);
  if ((found.data as any[]).length > 0) return (found.data as any[])[0].id;

  const form: Record<string, string> = {
    product: opts.product,
    currency: "usd",
    unit_amount: String(Math.round(opts.usdDollars * 100)),
    "recurring[interval]": opts.interval,
    lookup_key: opts.lookupKey,
    nickname: opts.nickname,
    "metadata[plan_id]": opts.planId,
  };
  // Multi-currency: present the same plan in every supported currency.
  for (const c of CURRENCIES) {
    if (c.code === "usd") continue;
    form[`currency_options[${c.code}][unit_amount]`] = String(toStripeAmount(opts.usdDollars, c));
  }
  const created = await stripe("POST", "prices", form);
  return created.id;
}

async function main() {
  const paid = PLANS.filter((p) => p.monthly !== null);
  const lines: string[] = [];

  console.error(`Provisioning ${paid.length} paid plans${WANT_ANNUAL ? " (monthly + annual)" : " (monthly)"}…\n`);

  for (const plan of paid) {
    const monthly = plan.monthly as number;
    const product = await ensureProduct(plan.id, plan.name);

    const monthlyPrice = await ensurePrice({
      product, planId: plan.id, lookupKey: plan.id,
      usdDollars: monthly, interval: "month",
      nickname: `${plan.name} — monthly`,
    });
    lines.push(`${ENV_KEY(plan.id)}=${monthlyPrice}`);

    if (WANT_ANNUAL) {
      const annualUsd = monthly * 12 * (1 - ANNUAL_DISCOUNT);
      const annualPrice = await ensurePrice({
        product, planId: plan.id, lookupKey: `${plan.id}-annual`,
        usdDollars: annualUsd, interval: "year",
        nickname: `${plan.name} — annual (${Math.round(ANNUAL_DISCOUNT * 100)}% off)`,
      });
      lines.push(`${ENV_KEY(plan.id)}_ANNUAL=${annualPrice}`);
    }
    console.error(`✓ ${plan.name}`);
  }

  console.error(`\n── Paste these into .env.local (do NOT commit) ──\n`);
  console.log(lines.join("\n"));
}

main().catch((err) => {
  console.error(`\n✗ ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
