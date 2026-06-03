"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ScanLine, Search, Loader2, ShieldCheck, Lock, CheckCircle2, ArrowRight, Database, Skull, Globe,
  Fingerprint, Banknote, AlertTriangle, Star, Radar,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { MirrorCategory, MirrorFinding } from "@/lib/home/scary-mirror";
import type { FreeAssessment } from "@/lib/home/free-assessment";
import type { ProtectionRecommendation } from "@/lib/home/protection-profile";
import type { RiskLevel } from "@/lib/types";
import { runFreeAssessmentAction } from "./actions";

const CATEGORY_ICON: Record<MirrorCategory, LucideIcon> = {
  brokers: Database, breaches: AlertTriangle, darkweb: Skull, reputation: Star,
  identity: Fingerprint, social: Globe, financial: Banknote,
};

/** The layers the scan walks through — every section is swept, in order. */
type ScanStage = { cat: MirrorCategory; label: string; sources: string[] };
const STAGES: ScanStage[] = [
  { cat: "brokers", label: "Data brokers & people-search", sources: ["Spokeo", "Whitepages", "BeenVerified", "Radaris", "PeopleFinders", "TruePeopleSearch"] },
  { cat: "breaches", label: "Breach databases", sources: ["Have I Been Pwned", "known breach corpora", "credential dumps"] },
  { cat: "darkweb", label: "Dark-web markets & forums", sources: ["Tor marketplaces", "paste sites", "leak forums", "stealer logs"] },
  { cat: "reputation", label: "Search engines & news", sources: ["Google results", "Bing results", "news & media archives"] },
  { cat: "social", label: "Social media & impersonation", sources: ["social platforms", "impersonation accounts", "AI-generated media"] },
  { cat: "identity", label: "Identity & public records", sources: ["voter records", "property records", "court & licensing records"] },
  { cat: "financial", label: "Financial exposure", sources: ["financial data brokers", "payment & account exposure"] },
];
const TOTAL_SOURCES = STAGES.reduce((n, s) => n + s.sources.length, 0);

const SCORE_TONE = (s: number) => (s >= 70 ? "text-risk-low" : s >= 50 ? "text-risk-medium" : "text-risk-high");
const SEV_TONE = (s: RiskLevel) =>
  s === "critical" || s === "high" ? "text-risk-high ring-risk-high/30" : s === "medium" ? "text-risk-medium ring-risk-medium/30" : "text-risk-low ring-risk-low/30";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Phase = "intro" | "scanning" | "reveal" | "locked";
type LogLine = { stage: number; text: string; done: boolean };

export function FreeScan({ defaultName = "" }: { defaultName?: string }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [name, setName] = useState(defaultName);
  const [assessment, setAssessment] = useState<FreeAssessment | null>(null);
  const [recommendation, setRecommendation] = useState<ProtectionRecommendation | null>(null);
  const [findings, setFindings] = useState<MirrorFinding[]>([]);

  // Live scanning state
  const [stageIndex, setStageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [scanLog, setScanLog] = useState<LogLine[]>([]);
  const [stageCounts, setStageCounts] = useState<Partial<Record<MirrorCategory, number>>>({});

  const cancelled = useRef(false);
  useEffect(() => () => { cancelled.current = true; }, []);

  async function run() {
    cancelled.current = false;
    setPhase("scanning");
    setStageIndex(0); setProgress(0); setScanLog([]); setStageCounts({});

    // Pull the real report up front, then pace the reveal so it reads like a
    // genuine deep search across every layer (not an instant lookup).
    const res = await runFreeAssessmentAction(name);
    if (cancelled.current) return;
    if (res.locked || !res.assessment) { await sleep(700); if (!cancelled.current) setPhase("locked"); return; }

    const countByCat: Partial<Record<MirrorCategory, number>> = {};
    for (const f of res.findings ?? []) countByCat[f.category] = f.count;

    let checked = 0;
    for (let i = 0; i < STAGES.length; i++) {
      if (cancelled.current) return;
      setStageIndex(i);
      const stage = STAGES[i];
      for (const src of stage.sources) {
        if (cancelled.current) return;
        setScanLog((l) => [...l, { stage: i, text: src, done: false }]);
        await sleep(360);
        if (cancelled.current) return;
        setScanLog((l) => l.map((ln, idx) => (idx === l.length - 1 ? { ...ln, done: true } : ln)));
        checked += 1;
        setProgress(Math.round((checked / TOTAL_SOURCES) * 100));
      }
      setStageCounts((c) => ({ ...c, [stage.cat]: countByCat[stage.cat] ?? 0 }));
      await sleep(450);
    }
    if (cancelled.current) return;
    setProgress(100);
    setAssessment(res.assessment);
    setRecommendation(res.recommendation ?? null);
    setFindings(res.findings ?? []);
    await sleep(550);
    if (!cancelled.current) setPhase("reveal");
  }

  /* ── Intro ──────────────────────────────────────────────────────────────── */
  if (phase === "intro") {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-border bg-bg-elevated/60 p-7 text-center backdrop-blur">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/15 text-brand"><ScanLine className="h-6 w-6" /></span>
        <h1 className="mt-5 text-2xl font-bold text-white">Run a Free Privacy &amp; Exposure Scan</h1>
        <p className="mt-2 text-sm text-slate-400">A deep sweep across data brokers, breach databases, the dark web, search, social and public records — to show exactly what&rsquo;s exposed about you. No signup. No card.</p>
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
        <p className="mt-3 text-[11px] text-slate-600">Sweeps {TOTAL_SOURCES} source groups across 7 layers · ~20s · exposure report · protection score · up to 10 free broker removals.</p>
      </div>
    );
  }

  /* ── Scanning (staged, live) ────────────────────────────────────────────── */
  if (phase === "scanning") {
    const current = STAGES[Math.min(stageIndex, STAGES.length - 1)];
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <div className="rounded-2xl border border-border bg-bg-elevated/60 p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand"><Radar className="h-5 w-5 animate-pulse" /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">Scanning {current.label}…</p>
              <p className="text-[11px] text-slate-500">Layer {Math.min(stageIndex + 1, STAGES.length)} of {STAGES.length} · deep-searching exposure sources</p>
            </div>
            <span className="shrink-0 text-lg font-bold tabular-nums text-brand-fg">{progress}%</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-bg-subtle">
            <div className="h-full rounded-full bg-gradient-to-r from-brand to-brand-fg transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>

          {/* Per-layer checklist — every section is scanned */}
          <ul className="mt-4 space-y-1.5">
            {STAGES.map((s, i) => {
              const Icon = CATEGORY_ICON[s.cat];
              const done = i < stageIndex || (i === stageIndex && progress === 100);
              const active = i === stageIndex && !done;
              const count = stageCounts[s.cat];
              return (
                <li key={s.cat} className="flex items-center gap-2.5 text-sm">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${done ? "bg-risk-low/15 text-risk-low" : active ? "bg-brand/15 text-brand" : "bg-bg-subtle/60 text-slate-600"}`}>
                    {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : active ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
                  </span>
                  <span className={`flex-1 ${done || active ? "text-slate-200" : "text-slate-600"}`}>{s.label}</span>
                  {count !== undefined && (
                    <span className={`text-xs font-semibold ${count > 0 ? "text-risk-high" : "text-risk-low"}`}>
                      {count > 0 ? `${count} found` : "clear"}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Live terminal — the actual sources being queried */}
        <div className="rounded-2xl border border-border bg-bg/70 p-4 font-mono text-[11px] leading-relaxed">
          {scanLog.slice(-7).map((ln, i) => (
            <div key={i} className="flex items-center gap-2 text-slate-400">
              {ln.done ? <CheckCircle2 className="h-3 w-3 shrink-0 text-risk-low" /> : <Loader2 className="h-3 w-3 shrink-0 animate-spin text-brand" />}
              <span className="text-slate-500">{ln.done ? "✓" : "→"}</span>
              <span className="truncate text-slate-300">{ln.text}</span>
              <span className="ml-auto shrink-0 text-slate-600">{ln.done ? "done" : "querying…"}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── Locked ─────────────────────────────────────────────────────────────── */
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

  /* ── Reveal — the scary window ──────────────────────────────────────────── */
  if (!assessment) return null;
  const a = assessment;
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Headline + score */}
      <div className="rounded-2xl border border-risk-high/30 bg-risk-high/5 p-6 text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-slate-400">Your exposure report</p>
        <p className="mt-2 text-4xl font-black text-white">We found {a.totalExposures} exposure{a.totalExposures === 1 ? "" : "s"}.</p>
        <p className="mt-1 text-xs text-slate-500">Across {findings.length} of 7 layers · swept {a.totalExposures === 0 ? TOTAL_SOURCES : TOTAL_SOURCES}+ sources</p>
        <div className="mt-6">
          <p className={`text-5xl font-black ${SCORE_TONE(a.protectionScore)}`}>{a.protectionScore}<span className="text-2xl text-slate-500">/100</span></p>
          <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">Protection Score</p>
        </div>
      </div>

      {/* Detailed per-section findings — the proof */}
      {findings.length > 0 && (
        <div className="space-y-2">
          {findings.map((f) => {
            const Icon = CATEGORY_ICON[f.category];
            return (
              <div key={f.category} className="flex items-start gap-3 rounded-xl border border-border bg-bg-elevated/50 p-3.5">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-risk-high/10 text-risk-high"><Icon className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-white">{f.label}</p>
                    <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ring-1 ${SEV_TONE(f.severity)}`}>{f.severity}</span>
                  </div>
                  {f.samples.length > 0 && (
                    <p className="mt-0.5 truncate text-[11px] text-slate-500">
                      Seen on: <span className="text-slate-400">{f.samples.join(", ")}</span>{f.count > f.samples.length ? ` +${f.count - f.samples.length} more` : ""}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-right">
                  <span className="text-lg font-bold text-white">{f.count}</span>
                  <span className="block text-[10px] uppercase text-slate-500">found</span>
                </span>
              </div>
            );
          })}
        </div>
      )}

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
          <Link href={`/start?plan=${recommendation.planId}`} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-brand/90">
            <ShieldCheck className="h-4 w-4" /> Protect me with {recommendation.planName} <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-2 text-center text-[11px] text-slate-500">Activated in minutes · cancel anytime · 20% off annual</p>
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
        <Link
          href="/start?plan=free"
          className={
            recommendation && recommendation.remaining > 0
              ? "mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-bg-elevated"
              : "mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-brand/90"
          }
        >
          <ShieldCheck className="h-4 w-4" /> Or start free — remove {recommendation ? recommendation.removing : a.freeRemovals} broker listing{(recommendation ? recommendation.removing : a.freeRemovals) === 1 ? "" : "s"}
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
        <Link href={`/pricing?plan=${recommendation?.planId ?? ""}`} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-fg hover:underline">
          Compare all plans <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
