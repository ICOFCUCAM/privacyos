import Link from "next/link";
import { cookies } from "next/headers";
import {
  ShieldCheck, Trash2, Workflow as WorkflowIcon, Star, Radar, ArrowUpRight, ArrowDownRight,
  CheckCircle2, AlertTriangle, MessageSquareHeart, ArrowRight, Search, Eye, Sparkles, SlidersHorizontal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui";
import { getDataSource } from "@/lib/data";
import { runPlaybooks, exposureToFinding, threatToFinding } from "@/lib/agents/playbooks";
import { buildWorkflows } from "@/lib/agents/workflows";
import {
  buildProtectionHome, type ProtectionBand, type ProtectionAction,
} from "@/lib/home/protection-home";
import { coerceMode, AUTONOMY_COOKIE, AUTONOMY_META } from "@/lib/home/autonomy";
import { tierLens } from "@/lib/home/tiers";
import { getEntitlements } from "@/lib/billing/subscription";
import type { RiskLevel } from "@/lib/types";
import { cn } from "@/lib/ui";

export const metadata = { title: "Protection" };

const BAND_META: Record<ProtectionBand, { label: string; ring: string; text: string; bar: string }> = {
  secure: { label: "Secure", ring: "ring-risk-low/40", text: "text-risk-low", bar: "bg-risk-low" },
  protected: { label: "Protected", ring: "ring-risk-low/40", text: "text-risk-low", bar: "bg-risk-low" },
  fair: { label: "Getting safer", ring: "ring-risk-medium/40", text: "text-risk-medium", bar: "bg-risk-medium" },
  exposed: { label: "Exposed", ring: "ring-risk-high/40", text: "text-risk-high", bar: "bg-risk-high" },
};

const DOING_ICON: Record<ProtectionAction["kind"], LucideIcon> = {
  removal: Trash2, workflow: WorkflowIcon, reputation: Star, monitoring: Radar,
};

const RISK_CLS: Record<RiskLevel, string> = {
  low: "text-risk-low ring-risk-low/30",
  medium: "text-risk-medium ring-risk-medium/30",
  high: "text-risk-high ring-risk-high/30",
  critical: "text-risk-high ring-risk-high/30",
};

export default async function ProtectionHomePage({
  searchParams,
}: {
  searchParams: Promise<{ activated?: string }>;
}) {
  const ds = await getDataSource();
  const [data, store, params, entitlements] = await Promise.all([ds.getDataset(), cookies(), searchParams, getEntitlements()]);
  let removals: Awaited<ReturnType<typeof ds.listRemovals>> = [];
  try { removals = await ds.listRemovals(); } catch { removals = []; }

  const lens = tierLens(entitlements.planId);

  const mode = coerceMode(store.get(AUTONOMY_COOKIE)?.value);
  const runs = runPlaybooks([
    ...data.exposures.map(exposureToFinding),
    ...data.threats.map(threatToFinding),
  ]);
  const workflows = buildWorkflows(runs);

  const home = buildProtectionHome({
    riskScore: data.riskScore,
    exposures: { length: data.exposures.length },
    threats: data.threats,
    recommendations: data.recommendations,
    removals,
    workflows,
    mode,
  });

  const band = BAND_META[home.band];
  const name = data.subject.displayName?.split(" ")[0] ?? "there";
  const justActivated = params.activated !== undefined;
  const activatedPacks = Number(params.activated) || 0;

  return (
    <div className="mx-auto max-w-3xl space-y-4 py-2">
      {justActivated && (
        <div className="flex items-center gap-2 rounded-xl border border-risk-low/30 bg-risk-low/10 px-3.5 py-2.5 text-sm text-risk-low">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Protection activated — {AUTONOMY_META[home.mode].label} mode on{activatedPacks > 0 ? `, ${activatedPacks} protection pack${activatedPacks === 1 ? "" : "s"} installed` : ""}. We&rsquo;re on it.
        </div>
      )}

      {/* ① Status */}
      <Card className={cn("p-6 ring-1", band.ring)}>
        <div className="flex flex-wrap items-center gap-5">
          <div className="relative grid h-24 w-24 shrink-0 place-items-center">
            <svg viewBox="0 0 100 100" className="h-24 w-24 -rotate-90">
              <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="8" className="text-border" />
              <circle
                cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round"
                className={band.text}
                strokeDasharray={`${(home.protectionScore / 100) * 276.46} 276.46`}
              />
            </svg>
            <div className="absolute text-center">
              <p className={cn("text-2xl font-bold", band.text)}>{home.protectionScore}</p>
              <p className="text-[9px] uppercase tracking-wide text-slate-500">/ 100</p>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className={cn("h-5 w-5", band.text)} />
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1", band.text, band.ring)}>{band.label}</span>
              {home.delta !== 0 && (
                <span className={cn("inline-flex items-center gap-0.5 text-xs font-semibold", home.delta > 0 ? "text-risk-low" : "text-risk-high")}>
                  {home.delta > 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                  {home.delta > 0 ? "+" : ""}{home.delta} this period
                </span>
              )}
              <Link href="/dashboard/scan" title="Change how hands-on you are" className="ml-auto inline-flex items-center gap-1 rounded-full bg-bg-subtle/60 px-2 py-0.5 text-[10px] font-medium text-slate-400 ring-1 ring-border hover:text-white">
                <SlidersHorizontal className="h-3 w-3" /> {AUTONOMY_META[home.mode].label}
              </Link>
            </div>
            <p className="mt-1.5 text-lg font-semibold leading-snug text-white">Hi {name} — {home.headline}</p>
          </div>
        </div>
      </Card>

      {/* ② What we're doing for you */}
      <Card className="p-4">
        <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          <Sparkles className="h-3.5 w-3.5 text-brand" /> What we're doing for you
        </p>
        <ul className="space-y-2">
          {home.doing.map((d, i) => {
            const Icon = DOING_ICON[d.kind];
            return (
              <li key={i} className="flex items-center gap-3 rounded-xl border border-border bg-bg-subtle/40 p-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand/15 text-brand"><Icon className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">{d.label}</p>
                  <p className="text-[11px] text-slate-500">{d.detail}</p>
                </div>
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-risk-low/60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-risk-low" />
                </span>
              </li>
            );
          })}
        </ul>
      </Card>

      {/* ③ What needs you */}
      <Card className="p-4">
        <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          <AlertTriangle className="h-3.5 w-3.5 text-risk-medium" /> What needs you
        </p>
        {home.needsYou.length === 0 ? (
          <div className="flex items-center gap-2 rounded-xl border border-risk-low/30 bg-risk-low/10 p-3 text-sm text-risk-low">
            <CheckCircle2 className="h-4 w-4 shrink-0" /> Nothing needs you right now — we've got it handled.
          </div>
        ) : (
          <ul className="space-y-2">
            {home.needsYou.map((n) => (
              <li key={n.id} className="flex items-center gap-3 rounded-xl border border-border bg-bg-subtle/40 p-3">
                <span className={cn("rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ring-1", RISK_CLS[n.riskLevel])}>{n.riskLevel}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{n.title}</p>
                  <p className="truncate text-[11px] text-slate-500">{n.why}</p>
                </div>
                <Link href="/dashboard/recommendations" className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand/90">
                  {n.actionLabel} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ④ What we found */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            <Eye className="h-3.5 w-3.5 text-brand" /> What we found
          </p>
          <Link href="/dashboard/scan" className="text-[11px] font-medium text-brand-fg hover:underline">Re-scan my exposure →</Link>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Exposures" value={home.found.exposures} tone="text-white" />
          <Stat label="Active threats" value={home.found.threats} tone={home.found.threats > 0 ? "text-risk-medium" : "text-risk-low"} />
          <Stat label="Removing now" value={home.found.removalsInFlight} tone="text-white" />
          <Stat label="Already removed" value={home.found.removed} tone="text-risk-low" />
        </div>
        {home.found.topConcern && (
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
            <Search className="h-3 w-3 text-risk-medium" /> Top concern: <span className="text-slate-300">{home.found.topConcern}</span>
          </p>
        )}
      </Card>

      {/* Tier lens — depth appropriate to the customer's plan */}
      <Link href={lens.href} className="flex items-center gap-3 rounded-2xl border border-border bg-bg-subtle/40 p-4 transition hover:border-brand/30">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand/15 text-brand"><ShieldCheck className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">{lens.title}</p>
          <p className="text-[11px] text-slate-400">{lens.subtitle}</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-fg">{lens.cta} <ArrowRight className="h-3.5 w-3.5" /></span>
      </Link>

      {/* Assistant footer — the natural-language front door */}
      <Link
        href="/dashboard/assistant"
        className="flex items-center gap-3 rounded-2xl border border-brand/30 bg-brand/10 p-4 transition hover:bg-brand/15"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand/20 text-brand"><MessageSquareHeart className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">Tell us what to protect</p>
          <p className="text-[11px] text-slate-400">&ldquo;Protect my family&rdquo; · &ldquo;Remove my data from brokers&rdquo; · &ldquo;Watch my reputation&rdquo;</p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-brand" />
      </Link>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg-subtle/40 p-3 text-center">
      <p className={cn("text-2xl font-bold", tone)}>{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  );
}
