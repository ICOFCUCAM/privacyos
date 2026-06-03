"use client";

import { useEffect, useState } from "react";
import { Database, AlertTriangle, Eye, Search, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Row = { icon: LucideIcon; label: string; result: string; bad: boolean };
const ROWS: Row[] = [
  { icon: Database, label: "Data brokers", result: "3 listings", bad: true },
  { icon: AlertTriangle, label: "Breach databases", result: "2 breaches", bad: true },
  { icon: Eye, label: "Dark web & leaks", result: "Clear", bad: false },
  { icon: Search, label: "Search & news", result: "5 results", bad: true },
];

const TARGET = 72;
const C = 2 * Math.PI * 52; // ring circumference

/**
 * The hero's signature moment: a live exposure scan that fills a protection-score
 * ring while it sweeps each layer and reports findings — demonstrating the
 * product and the free-scan value in one glance. Dependency-free; replays on a
 * loop, and renders the finished state under reduced-motion.
 */
export function HeroScan() {
  const [score, setScore] = useState(0);
  const [step, setStep] = useState(0); // how many layers have been scanned
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setScore(TARGET);
      setStep(ROWS.length);
      return;
    }

    setScore(0);
    setStep(0);
    let raf = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Fill the score ring.
    const start = performance.now();
    const dur = 1700;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      setScore(Math.round(TARGET * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    timers.push(setTimeout(() => { raf = requestAnimationFrame(tick); }, 300));

    // Stagger the layer rows.
    ROWS.forEach((_, i) => timers.push(setTimeout(() => setStep(i + 1), 500 + i * 650)));

    // Replay the whole thing every ~9s so the hero feels alive.
    const loop = setTimeout(() => setCycle((c) => c + 1), 9000);
    timers.push(loop);

    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
    };
  }, [cycle]);

  const dash = (score / 100) * C;

  return (
    <div className="relative mx-auto w-full max-w-md">
      {/* radar sweep behind the card */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -z-0 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2 opacity-60">
        <div
          className="radar-sweep absolute inset-0 rounded-full blur-xl"
          style={{ background: "conic-gradient(from 0deg, rgba(99,102,241,0.35), transparent 30%, transparent 100%)" }}
        />
      </div>

      <div className="relative z-10 rounded-3xl border border-border bg-bg-elevated/70 p-6 shadow-2xl shadow-black/40 ring-1 ring-white/5 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Exposure scan</span>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-risk-low">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-risk-low/70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-risk-low" />
            </span>
            LIVE
          </span>
        </div>

        {/* Protection score ring */}
        <div className="mt-4 flex items-center gap-5">
          <div className="relative grid h-32 w-32 shrink-0 place-items-center">
            <svg viewBox="0 0 120 120" className="h-32 w-32 -rotate-90">
              <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="9" className="text-border" />
              <circle
                cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round"
                className="text-brand transition-[stroke-dasharray] duration-200 ease-out"
                strokeDasharray={`${dash} ${C}`}
              />
            </svg>
            <div className="absolute text-center">
              <p className="text-3xl font-black text-white">{score}</p>
              <p className="text-[9px] uppercase tracking-wide text-slate-500">/ 100</p>
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">Protection score</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              We scanned every layer and found where you&rsquo;re exposed — then started removing it.
            </p>
          </div>
        </div>

        {/* Scanned layers */}
        <ul className="mt-5 space-y-1.5">
          {ROWS.map((r, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <li key={r.label} className="flex items-center gap-2.5 rounded-lg border border-border bg-bg-subtle/40 px-3 py-2 text-sm">
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${done ? "bg-brand/15 text-brand" : "bg-bg-subtle/60 text-slate-600"}`}>
                  {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : active ? <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" /> : <r.icon className="h-3.5 w-3.5" />}
                </span>
                <span className={`flex-1 ${done || active ? "text-slate-200" : "text-slate-600"}`}>{r.label}</span>
                {done && (
                  <span className={`text-xs font-semibold ${r.bad ? "text-risk-high" : "text-risk-low"}`}>{r.result}</span>
                )}
              </li>
            );
          })}
        </ul>

        <div className="mt-4 flex items-center gap-2 rounded-lg bg-risk-low/10 px-3 py-2 text-xs text-risk-low ring-1 ring-risk-low/20">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
          {step >= ROWS.length ? "Removing your exposures automatically…" : "Scanning 60+ sources…"}
        </div>
      </div>
    </div>
  );
}
