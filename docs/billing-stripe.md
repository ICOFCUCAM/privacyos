# Billing — Stripe

The app talks to Stripe over its REST API (no SDK). It runs fully in **demo mode
with no keys**; billing activates when the env vars below are set. You do **not**
need the Claude Code Stripe plugin — that's an assistant tool, not an app
dependency.

## 1. Get your keys

Stripe Dashboard → Developers → API keys. Use **test mode** (`sk_test_…`) first.

## 2. Create Products & Prices (one command)

The setup script provisions a Stripe Product + Price for every paid plan in the
catalog (`src/lib/billing/plans.ts`) and prints the env lines to paste. It is
**idempotent** — re-running reuses existing Products (matched by
`metadata.plan_id`) and Prices (matched by `lookup_key`).

```bash
# monthly prices only
STRIPE_SECRET_KEY=sk_test_xxx npm run stripe:setup

# monthly + annual (20% off) — enables the pricing page's yearly toggle
STRIPE_SECRET_KEY=sk_test_xxx npm run stripe:setup -- --annual
```

It prints, e.g.:

```
STRIPE_PRICE_STARTER=price_…
STRIPE_PRICE_STARTER_ANNUAL=price_…
STRIPE_PRICE_PLUS=price_…
…
```

(Refuses to run against an `sk_live_` key by accident.)

## 3. Configure env

Put the keys + printed price ids in `.env.local` (git-ignored — **never commit
secrets**):

```
STRIPE_SECRET_KEY=sk_test_…
STRIPE_WEBHOOK_SECRET=whsec_…
STRIPE_PRICE_PLUS=price_…
STRIPE_PRICE_PLUS_ANNUAL=price_…
# …one per paid plan (see .env.example)
```

If a plan has no `_ANNUAL` price, the annual toggle falls back to its monthly
price for that plan.

## 4. Webhook

Point a Stripe webhook at `POST /api/stripe/webhook` for:
`checkout.session.completed`, `customer.subscription.created`,
`customer.subscription.updated`, `customer.subscription.deleted`. Copy its
signing secret into `STRIPE_WEBHOOK_SECRET`.

Local testing: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

## How it fits together

| Piece | File |
|---|---|
| REST client (checkout + portal), price mapping | `src/lib/billing/stripe.ts` |
| Start checkout (validates plan/price/user, monthly vs annual) | `src/app/api/checkout/route.ts` |
| Webhook (signature-verified, validates plan_id, upserts `subscriptions`) | `src/app/api/stripe/webhook/route.ts` |
| Manage/cancel (Billing Portal) | `src/app/dashboard/settings/billing-actions.ts` |
| Entitlements derived from the subscription | `src/lib/billing/entitlements.ts` |
| Provisioning script | `scripts/stripe-setup.ts` (`npm run stripe:setup`) |

Security: the secret key + webhook secret live only in env. The webhook and
cron use the service-role client and **fail closed** when their secrets are
unset. The webhook only provisions plans it recognizes.

## Multi-currency

Customers choose their currency on the pricing page (`src/lib/billing/currencies.ts`
— 12 presentment currencies: USD, EUR, GBP, CAD, AUD, NOK, SEK, DKK, CHF, JPY,
SGD, INR). Each Stripe Price is created with **`currency_options`** for all of
them (by `stripe:setup`), and `/api/checkout` opens the Checkout Session in the
selected currency, so the customer is charged in their own currency.

- The `rate` table in `currencies.ts` is an approximate USD→local multiplier
  used to display localized prices and seed the `currency_options` amounts.
  Replace with bespoke local prices for production-grade pricing if desired.
- Adding currencies later: extend `CURRENCIES`, then **re-run `stripe:setup`**.
  Existing Prices are reused by `lookup_key`, so to attach new `currency_options`
  to an existing plan you create a fresh Price (bump the lookup key) or add the
  options in the dashboard.
- France/Europe use **EUR** — the former French Franc (FRF) is obsolete and
  unsupported by Stripe.

(Note: this is presentment currency only. A separate **language switcher** /
i18n is a distinct piece of work — the currency layer doesn't depend on it.)

## Going live

Swap `sk_test_…` → `sk_live_…`, re-run the setup script (remove the live-key
guard deliberately, or create the live prices in the dashboard), point a
**live-mode** webhook at the deployed `/api/stripe/webhook`, and set
`NEXT_PUBLIC_SITE_URL` so success/cancel/portal return URLs are correct.
