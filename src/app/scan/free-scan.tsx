"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ScanLine, Search, Loader2, ShieldCheck, Lock, CheckCircle2, ArrowRight, Database, Skull, Globe,
  Fingerprint, UserX, Banknote, AlertTriangle, Star,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { MirrorCategory } from "@/lib/home/scary-mirror";
import type { FreeAssessment } from "@/lib/home/free-assessment";
import type { ProtectionRecommendation } from "@/lib/home/protection-profile";
import { runFreeAssessmentAction } from "./actions";

const CATEGORY_ICON: Record<MirrorCategory, LucideIcon> = {
  brokers: Database, breaches: AlertTriangle, darkweb: Skull, reputation: Star,
  identity: Fingerprint, social: Globe, financial: Banknote,
};

const SCORE_TONE = (s: number) => (s >= 70 ? "text-risk-low" : s >= 50 ? "text-risk-medium" : "text-risk-high");

type Phase = "intro" | "scanning" | "reveal" | "locked";

export function FreeScan({ defaultName = "" }: { defaultName?: string }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [name, setName] = useState(defaultName);
  const [assessment, setAssessment] = useState<FreeAssessment | null>(null);
  const [recommendation, setRecommendation] = useState<ProtectionRecommendation | null>(null);
  const [pending, start] = useTransition();

  function run() {
    setPhase("scanning");
    start(async () => {
      const res = await runFreeAssessmentAction(name);
      if (res.locked || !res.assessment) { setPhase("locked"); return; }
      setAssessment(res.assessment);
      setRecommendation(res.recommendation ?? null);
      setPhase("reveal");
    });
  }

  if (phase === "intro") {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-border bg-bg-elevated/60 p-7 text-center backdrop-blur">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/15 text-brand"><ScanLine className="h-6 w-6" /></span>
        <h1 className="mt-5 text-2xl font-bold text-white">Run a Free Privacy &amp; Exposure Scan</h1>
        <p className="mt-2 text-sm text-slate-400">See exactly what&rsquo;s exposed about you across data brokers, breaches, the dark web and more. No signup. No card.</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") run(); }}
          placeholder="Your name (optional)"
          className="mt-5 w-full rounded-lg border border-border bg-bg-subtle px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-brand focus:outline-none"
        />
        <button onClick={run} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-brand/90">
          <Search className="h-4 w-4" /> Scan my exposure — free
        </button>
        <p className="mt-3 text-[11px] text-slate-600">One free scan · exposure report · protection score · up to 10 broker removals.</p>
      </div>
    );
  }

  if (phase === "scanning") {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-border bg-bg-elevated/60 p-7 text-center">
        <Loader2 className="mx-auto h-7 w-7 animate-spin text-brand" />
        <p className="mt-4 text-lg font-semibold text-white">Scanning 60+ sources…</p>
        <p className="mt-1 text-sm text-slate-500">Brokers · breaches · dark web · search · social · financial</p>
      </div>
    );
  }

  if (phase === "locked") {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-brand/30 bg-brand/10 p-7 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/20 text-brand"><Lock className="h-6 w-6" /></span>
        <h1 className="mt-5 text-2xl font-bold text-white">You&rsquo;ve used your free scan</h1>
        <p className="mt-2 text-sm text-slate-400">Re-scanning and continuous monitoring are part of a Protection Plan. Upgrade to keep watching, removing and defending — automatically.</p>
        <Link href="/pricing" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-brand/90">
          See Protection Plans <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  // reveal — the scary window
  if (!assessment) return null;
  const a = assessment;
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* The scary window */}
      <div className="rounded-2xl border border-risk-high/30 bg-risk-high/5 p-6 text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-slate-400">Your exposure report</p>
        <p className="mt-2 text-4xl font-black text-white">We found {a.totalExposures} exposure{a.totalExposures === 1 ? "" : "s"}.</p>
        <div className="mx-auto mt-5 max-w-sm space-y-1.5 text-left">
          {a.breakdown.map((row) => {
            const Icon = CATEGORY_ICON[row.category];
            return (
              <div key={row.category} className="flex items-center gap-2 text-sm text-slate-300">
                <Icon className="h-4 w-4 shrink-0 text-risk-high" />
                <span className="flex-1">{row.label}</span>
                <span className="font-bold text-white">{row.count}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-6">
          <p className={`text-5xl font-black ${SCORE_TONE(a.protectionScore)}`}>{a.protectionScore}<span className="text-2xl text-slate-500">/100</span></p>
          <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">Protection Score</p>
        </div>
      </div>

      {/* Remaining-risk trigger — found / removing / remaining */}
      {recommendation && (
        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border bg-border text-center">
          <div className="bg-bg-elevated/70 px-3 py-4">
            <p className="text-2xl font-bold text-white">{recommendation.found}</p>
            <p className="mt-0.5 text-[11px] uppercase tracking-wide text-slate-500">Found</p>
          </div>
          <div className="bg-bg-elevated/70 px-3 py-4">
            <p className="text-2xl font-bold text-risk-low">{recommendation.removing}</p>
            <p className="mt-0.5 text-[11px] uppercase tracking-wide text-slate-500">Removing free</p>
          </div>
          <div className="bg-bg-elevated/70 px-3 py-4">
            <p className="text-2xl font-bold text-risk-high">{recommendation.remaining}</p>
            <p className="mt-0.5 text-[11px] uppercase tracking-wide text-slate-500">Still at risk</p>
          </div>
        </div>
      )}

      {/* Recommended package — silent profiling → the right plan, not all plans */}
      {recommendation && recommendation.remaining > 0 && (
        <div className="rounded-2xl border border-brand/40 bg-brand/10 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-fg">Recommended for you</p>
          <p className="mt-1 text-lg font-bold text-white">{recommendation.planName}</p>
          <p className="mt-1 text-sm text-slate-400">
            Based on your scan, {recommendation.planName} is the best fit to handle the remaining
            {" "}{recommendation.remaining} exposure{recommendation.remaining === 1 ? "" : "s"} — and keep watching, removing and defending automatically.
          </p>
          <Link href={`/pricing?plan=${recommendation.planId}`} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-brand/90">
            <ShieldCheck className="h-4 w-4" /> Protect me with {recommendation.planName} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Free value — builds trust */}
      <div className="rounded-2xl border border-risk-low/30 bg-risk-low/10 p-5">
        <p className="text-sm font-semibold text-white">Your free protection includes</p>
        <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {a.freeIncludes.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-slate-200"><CheckCircle2 className="h-4 w-4 shrink-0 text-risk-low" /> {f}</li>
          ))}
        </ul>
        <Link href="/login?next=/dashboard/home" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-brand/90">
          <ShieldCheck className="h-4 w-4" /> Claim my {a.freeRemovals} free broker removals
        </Link>
      </div>

      {/* Locked — visible value, not activatable */}
      <div className="rounded-2xl border border-border bg-bg-elevated/50 p-5">
        <p className="text-sm font-semibold text-white">Available with Protection Plans</p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {a.lockedFeatures.map((f) => (
            <div key={f} className="flex items-center gap-2 rounded-lg border border-border bg-bg-subtle/40 px-3 py-2 text-sm text-slate-400">
              <Lock className="h-3.5 w-3.5 shrink-0 text-slate-600" /> {f}
            </div>
          ))}
        </div>
        <Link href="/pricing" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-fg hover:underline">
          See Protection Plans <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
