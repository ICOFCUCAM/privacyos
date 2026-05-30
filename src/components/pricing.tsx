"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import {
  annualMonthly,
  annualTotal,
  CATEGORY_META,
  CATEGORY_ORDER,
  plansByCategory,
  type Plan,
} from "@/lib/billing/plans";
import { cn } from "@/lib/ui";

function priceLabel(plan: Plan, annual: boolean) {
  if (plan.monthly === null) return { big: "Custom", sub: "Contact sales" };
  const m = annual ? annualMonthly(plan.monthly) : plan.monthly;
  const big = `$${m % 1 === 0 ? m : m.toFixed(2)}`;
  const sub = annual ? `/mo · billed $${annualTotal(plan.monthly).toLocaleString()}/yr` : "/month";
  return { big, sub };
}

function PlanCard({ plan, annual }: { plan: Plan; annual: boolean }) {
  const { big, sub } = priceLabel(plan, annual);
  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border p-6",
        plan.featured ? "border-brand/50 bg-brand/5 ring-1 ring-brand/30" : "border-border bg-bg-elevated/60",
      )}
    >
      {plan.featured && (
        <span className="mb-3 inline-flex w-fit rounded-full bg-brand px-2.5 py-0.5 text-[11px] font-semibold text-white">
          Most popular
        </span>
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

      <button
        className={cn(
          "mt-6 rounded-lg px-4 py-2.5 text-sm font-semibold transition",
          plan.featured
            ? "bg-brand text-white hover:bg-brand/90"
            : "border border-border text-slate-200 hover:bg-bg-elevated",
        )}
      >
        {plan.monthly === null ? "Contact sales" : "Choose plan"}
      </button>
    </div>
  );
}

export function PricingTable() {
  const [annual, setAnnual] = useState(true);

  return (
    <div className="space-y-12">
      {/* Billing toggle */}
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
                <PlanCard key={p.id} plan={p} annual={annual} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
