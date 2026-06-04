"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Sparkles } from "lucide-react";
import {
  annualMonthly,
  annualTotal,
  CATEGORY_META,
  CATEGORY_ORDER,
  plansByCategory,
  type Plan,
} from "@/lib/billing/plans";
import { cardInclusions } from "@/lib/billing/inclusions";
import {
  CURRENCIES, DEFAULT_CURRENCY, formatMoney, resolveCurrency, type Currency,
} from "@/lib/billing/currencies";
import { cn } from "@/lib/ui";

function priceLabel(plan: Plan, annual: boolean, currency: Currency) {
  if (plan.monthly === null) return { big: "Custom", sub: "Contact sales" };
  const m = annual ? annualMonthly(plan.monthly) : plan.monthly;
  const big = formatMoney(m, currency);
  const sub = annual ? `/mo · billed ${formatMoney(annualTotal(plan.monthly), currency)}/yr` : "/month";
  return { big, sub };
}

function PlanCard({
  plan,
  annual,
  currency,
  highlighted = false,
  purchasable = true,
}: {
  plan: Plan;
  annual: boolean;
  currency: Currency;
  highlighted?: boolean;
  purchasable?: boolean;
}) {
  const { big, sub } = priceLabel(plan, annual, currency);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // When the visitor arrives from their free scan (/pricing?plan=…), bring the
  // recommended plan into view so the conversion path is obvious.
  useEffect(() => {
    if (highlighted) {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlighted]);

  // A paid, priced plan whose Stripe Price isn't wired up yet. Rather than a dead
  // end (or a raw "set STRIPE_PRICE_…" error), capture intent via signup.
  const isPaid = plan.monthly !== 0 && plan.monthly !== null;
  const billingPending = isPaid && !purchasable;

  async function choose() {
    if (plan.monthly === 0) {
      // Free plan is a conversion engine, not a checkout — start the free scan.
      window.location.href = "/scan";
      return;
    }
    if (plan.monthly === null) {
      window.location.href = "mailto:sales@privacyos.app?subject=" + encodeURIComponent(`${plan.name} enquiry`);
      return;
    }
    if (billingPending) {
      // Checkout for this plan isn't live yet — hand off to the single activation
      // door, which signs the visitor in and onboards them (capturing the lead).
      window.location.href = `/start?plan=${plan.id}`;
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ planId: plan.id, annual, currency: currency.code }),
      });
      // Not signed in: don't dead-end on a 401 — route through /start, which
      // bounces through login and resumes this exact plan's checkout.
      if (res.status === 401) {
        window.location.href = `/start?plan=${plan.id}`;
        return;
      }
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      // Never surface internal billing-config details to a customer.
      const raw: string = data.error ?? "";
      const friendly = /not configured|no stripe price/i.test(raw)
        ? "Checkout for this plan isn’t available yet — please try again shortly."
        : raw || "Could not start checkout.";
      setErr(friendly);
    } catch {
      setErr("Could not start checkout.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-col rounded-2xl border p-6 transition",
        highlighted
          ? "border-brand bg-brand/10 ring-2 ring-brand"
          : plan.featured
            ? "border-brand/50 bg-brand/5 ring-1 ring-brand/30"
            : "border-border bg-bg-elevated/60",
      )}
    >
      {highlighted ? (
        <span className="mb-3 inline-flex w-fit items-center gap-1 rounded-full bg-brand px-2.5 py-0.5 text-[11px] font-semibold text-white">
          <Sparkles className="h-3 w-3" /> Recommended from your scan
        </span>
      ) : (
        plan.featured && (
          <span className="mb-3 inline-flex w-fit rounded-full bg-brand px-2.5 py-0.5 text-[11px] font-semibold text-white">
            Most popular
          </span>
        )
      )}
      <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
      <p className="mt-1 min-h-[2.5rem] text-sm text-slate-400">{plan.tagline}</p>

      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-3xl font-bold text-white">{big}</span>
        <span className="text-xs text-slate-500">{sub}</span>
      </div>
      {plan.capacity && <p className="mt-1 text-xs text-brand-fg">{plan.capacity}</p>}

      <ul className="mt-5 flex-1 space-y-2">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
            {f}
          </li>
        ))}
      </ul>

      {/* Verified inclusions — derived from the real product gating, so pricing
          and the dashboard never disagree (esp. the credit-monitoring tier). */}
      {plan.category !== "ai_addon" && (
        <div className="mt-4 space-y-1.5 rounded-xl border border-border/60 bg-bg-subtle/40 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Verified inclusions</p>
          {cardInclusions(plan.id).map((i) => (
            <div key={i.label} className="flex items-center justify-between gap-3 text-[11px]">
              <span className="text-slate-400">{i.label}</span>
              <span className={cn("shrink-0 font-medium", i.included ? "text-slate-100" : "text-slate-600")}>
                {i.included ? i.detail : "—"}
              </span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={choose}
        disabled={busy}
        className={cn(
          "mt-6 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60",
          plan.featured
            ? "bg-brand text-white hover:bg-brand/90"
            : "border border-border text-slate-200 hover:bg-bg-elevated",
        )}
      >
        {busy
          ? "Starting…"
          : plan.monthly === 0
            ? "Start free scan"
            : plan.monthly === null
              ? "Contact sales"
              : billingPending
                ? "Get started"
                : "Choose plan"}
      </button>
      {err && <p className="mt-2 text-xs text-risk-critical">{err}</p>}
    </div>
  );
}

export function PricingTable({
  recommendedPlanId,
  purchasablePlanIds,
}: {
  recommendedPlanId?: string;
  /** Plan ids wired to a Stripe Price. When omitted, all paid plans are assumed
   *  purchasable (e.g. in tests/storybook). */
  purchasablePlanIds?: string[];
}) {
  const purchasable = purchasablePlanIds ? new Set(purchasablePlanIds) : null;
  const [annual, setAnnual] = useState(true);
  const [currencyCode, setCurrencyCode] = useState(DEFAULT_CURRENCY);
  const currency = resolveCurrency(currencyCode);

  return (
    <div className="space-y-12">
      {/* Currency + billing controls */}
      <div className="flex flex-col items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-400">
          <span>Currency</span>
          <select
            value={currencyCode}
            onChange={(e) => setCurrencyCode(e.target.value)}
            aria-label="Select currency"
            className="rounded-lg border border-border bg-bg-subtle px-3 py-1.5 text-sm text-white focus:border-brand/50 focus:outline-none"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>{c.flag} {c.code.toUpperCase()} — {c.label}</option>
            ))}
          </select>
        </label>

        <div className="flex items-center justify-center gap-3">
          <span className={cn("text-sm", !annual ? "text-white" : "text-slate-500")}>Monthly</span>
          <button
            onClick={() => setAnnual((v) => !v)}
            className="relative h-6 w-11 rounded-full bg-bg-subtle ring-1 ring-border transition"
            aria-label="Toggle annual billing"
          >
            <span
              className={cn(
                "absolute top-0.5 h-5 w-5 rounded-full bg-brand transition-all",
                annual ? "left-[22px]" : "left-0.5",
              )}
            />
          </button>
          <span className={cn("text-sm", annual ? "text-white" : "text-slate-500")}>
            Annual <span className="text-risk-low">save 20%</span>
          </span>
        </div>
        {currency.code !== "usd" && (
          <p className="text-[11px] text-slate-600">Prices shown in {currency.label} are indicative; you’ll be charged in {currency.code.toUpperCase()} at checkout.</p>
        )}
      </div>

      {CATEGORY_ORDER.map((cat) => {
        const meta = CATEGORY_META[cat];
        const plans = plansByCategory(cat);
        return (
          <section key={cat}>
            <div className="mb-5 text-center">
              <h2 className="text-2xl font-bold text-white">{meta.label}</h2>
              <p className="mt-1 text-sm text-slate-400">{meta.blurb}</p>
            </div>
            <div
              className={cn(
                "grid grid-cols-1 gap-4 sm:grid-cols-2",
                plans.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3",
              )}
            >
              {plans.map((p) => (
                <PlanCard
                  key={p.id}
                  plan={p}
                  annual={annual}
                  currency={currency}
                  highlighted={p.id === recommendedPlanId}
                  purchasable={purchasable ? purchasable.has(p.id) : true}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
