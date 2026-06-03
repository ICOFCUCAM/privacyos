"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useMotionValue, animate as animateMv } from "framer-motion";
import {
  ShieldCheck, Radar, Fingerprint, Users, Star, EyeOff, Trash2, Activity,
  Search, Bell, CheckCircle2, ChevronDown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { demoHeroMetrics, type HeroMetrics, type ActionTone } from "./metrics";

const TONE_DOT: Record<ActionTone, string> = { low: "bg-emerald-400", medium: "bg-amber-400", brand: "bg-indigo-400" };

const NAV: { icon: LucideIcon; label: string; active?: boolean }[] = [
  { icon: ShieldCheck, label: "Protection", active: true },
  { icon: Radar, label: "Exposures" },
  { icon: Fingerprint, label: "Identity" },
  { icon: Users, label: "Family" },
  { icon: Star, label: "Reputation" },
  { icon: EyeOff, label: "Dark Web" },
  { icon: Activity, label: "Monitoring" },
  { icon: Trash2, label: "Removals" },
];

/* ── animated number ──────────────────────────────────────────────────────── */
function AnimatedNumber({ value, suffix }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { setDisplay(value); return; }
    const controls = animateMv(mv, value, { duration: 1.6, ease: [0.16, 1, 0.3, 1] });
    const unsub = mv.on("change", (v) => setDisplay(Math.round(v)));
    return () => { controls.stop(); unsub(); };
  }, [inView, value, mv]);
  return <span ref={ref}>{display.toLocaleString()}{suffix}</span>;
}

/* ── flowing activity line ────────────────────────────────────────────────── */
function smoothPath(values: number[], w: number, h: number, pad = 4) {
  const n = values.length;
  const xs = values.map((_, i) => (i / (n - 1)) * w);
  const ys = values.map((v) => h - pad - v * (h - pad * 2));
  let d = `M ${xs[0]},${ys[0]}`;
  for (let i = 1; i < n; i++) {
    const cx = (xs[i - 1] + xs[i]) / 2;
    d += ` C ${cx},${ys[i - 1]} ${cx},${ys[i]} ${xs[i]},${ys[i]}`;
  }
  return { line: d, area: `${d} L ${w},${h} L 0,${h} Z`, endX: xs[n - 1], endY: ys[n - 1] };
}
function FlowLine({ values }: { values: number[] }) {
  const W = 220, H = 64;
  const p = smoothPath(values, W, H);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="flowfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={p.area} fill="url(#flowfill)" />
      <motion.path d={p.line} fill="none" stroke="#a5b4fc" strokeWidth="1.6" strokeLinecap="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4, ease: "easeInOut", delay: 0.5 }} />
      <motion.path d={p.line} fill="none" stroke="#e0e7ff" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="2 12"
        animate={{ strokeDashoffset: [0, -56] }} transition={{ duration: 2.6, ease: "linear", repeat: Infinity }} opacity={0.8} />
      <circle cx={p.endX} cy={p.endY} r="2.6" fill="#e0e7ff" />
      <circle cx={p.endX} cy={p.endY} r="2.6" fill="#a5b4fc">
        <animate attributeName="r" values="2.6;7;2.6" dur="2.2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.7;0;0.7" dur="2.2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/* ── score ring ───────────────────────────────────────────────────────────── */
function ScoreRing({ value }: { value: number }) {
  const [score, setScore] = useState(0);
  useEffect(() => {
    const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { setScore(value); return; }
    let raf = 0; const start = performance.now();
    const tick = (now: number) => { const t = Math.min(1, (now - start) / 1500); setScore(Math.round(value * (1 - Math.pow(1 - t, 3)))); if (t < 1) raf = requestAnimationFrame(tick); };
    const to = setTimeout(() => { raf = requestAnimationFrame(tick); }, 350);
    return () => { clearTimeout(to); cancelAnimationFrame(raf); };
  }, [value]);
  return (
    <div className="relative grid h-[58px] w-[58px] place-items-center">
      <svg viewBox="0 0 36 36" className="h-[58px] w-[58px] -rotate-90">
        <circle cx="18" cy="18" r="15.915" fill="none" stroke="currentColor" strokeWidth="3" className="text-white/10" />
        <circle cx="18" cy="18" r="15.915" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
          className="text-emerald-400 transition-[stroke-dasharray] duration-300" strokeDasharray={`${score} 100`} />
      </svg>
      <p className="absolute text-lg font-black leading-none text-white">{score}</p>
    </div>
  );
}

function StatCard({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-2.5 ${accent ? "border-indigo-400/25 bg-indigo-500/10" : "border-white/8 bg-white/[0.03]"}`}>
      {children}
    </div>
  );
}

const fade = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

/**
 * Layer 2 — the floating protection device. Full, dense dashboard (sidebar nav,
 * header, four outcome metrics, flowing activity, recent actions, protection
 * status) rendered as a physical glass tablet with thickness, bezel, edge
 * highlights and reflection. Outcome-emotion language; the product, dominant.
 */
export function ProtectionDashboard({ metrics, flat = false }: { metrics?: HeroMetrics; flat?: boolean }) {
  const m = metrics ?? demoHeroMetrics();
  const trendPct = 12 + Math.round(m.chart[m.chart.length - 1] * 10);

  return (
    <div style={{ perspective: 2200 }} className="w-full">
      <motion.div
        initial={{ opacity: 0, rotateY: flat ? 0 : -16, rotateX: flat ? 0 : 6, y: 34 }}
        animate={{ opacity: 1, rotateY: flat ? 0 : -13, rotateX: flat ? 0 : 4, y: 0 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformStyle: "preserve-3d", transformOrigin: "left center" }}
        className="relative"
      >
        {/* premium border glow */}
        <div aria-hidden className="absolute -inset-3 rounded-[2.1rem] bg-indigo-500/10 blur-2xl" />
        {/* thickness / drop layers → physical depth */}
        <div aria-hidden className="absolute -inset-1 translate-x-2.5 translate-y-4 rounded-[1.9rem] bg-black/60 blur-[5px]" />
        <div aria-hidden className="absolute -inset-px translate-x-1 translate-y-1.5 rounded-[1.8rem] bg-black/45" />

        {/* device bezel */}
        <div className="relative rounded-[1.8rem] bg-gradient-to-b from-white/[0.18] to-white/[0.04] p-[4px] shadow-[0_50px_120px_-25px_rgba(0,0,0,0.95)] ring-1 ring-white/14">
          {/* screen */}
          <div className="relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-[#0d1124] via-[#0b0e1c] to-[#080a14]">
            {/* top edge highlight + reflection sheen */}
            <div aria-hidden className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.10] via-transparent to-transparent" />
            <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[1.5rem] ring-1 ring-inset ring-indigo-400/10" />

            <motion.div
              variants={{ show: { transition: { staggerChildren: 0.07, delayChildren: 0.2 } } }}
              initial="hidden" animate="show" className="relative flex"
            >
              {/* sidebar */}
              <motion.aside variants={fade} className="hidden w-[24%] shrink-0 flex-col border-r border-white/5 bg-white/[0.02] p-3 sm:flex">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-white">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-indigo-400/80"><ShieldCheck className="h-3 w-3 text-white" /></span>
                  Privacy<span className="text-indigo-300">OS</span>
                </span>
                <ul className="mt-4 space-y-0.5">
                  {NAV.map((n) => (
                    <li key={n.label} className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[9px] ${n.active ? "bg-indigo-500/15 text-white ring-1 ring-indigo-400/25" : "text-slate-500"}`}>
                      <n.icon className={`h-2.5 w-2.5 ${n.active ? "text-indigo-300" : ""}`} /> {n.label}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto flex items-center gap-2 rounded-lg bg-white/[0.03] p-1.5 ring-1 ring-white/5">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-400/70 text-[8px] font-bold text-white">AJ</span>
                  <div className="min-w-0">
                    <p className="truncate text-[9px] font-semibold text-white">Alex Johnson</p>
                    <p className="truncate text-[7px] text-emerald-300">Protected</p>
                  </div>
                  <ChevronDown className="ml-auto h-2.5 w-2.5 text-slate-600" />
                </div>
              </motion.aside>

              {/* main */}
              <div className="min-w-0 flex-1 p-3.5">
                {/* header */}
                <motion.div variants={fade} className="flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-bold leading-tight text-white">You&rsquo;re protected</p>
                    <p className="text-[8px] text-slate-400">PrivacyOS is working for you</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="grid h-5 w-5 place-items-center rounded-md bg-white/5 text-slate-400"><Search className="h-2.5 w-2.5" /></span>
                    <span className="relative grid h-5 w-5 place-items-center rounded-md bg-white/5 text-slate-400"><Bell className="h-2.5 w-2.5" /><span className="absolute -right-0 -top-0 h-1.5 w-1.5 rounded-full bg-indigo-400" /></span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-1.5 py-0.5 text-[8px] font-semibold text-emerald-300 ring-1 ring-emerald-400/20">
                      <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" /></span>
                      LIVE
                    </span>
                  </div>
                </motion.div>

                {/* four outcome metrics — the focal points */}
                <motion.div variants={fade} className="mt-3 grid grid-cols-4 gap-1.5">
                  <StatCard accent>
                    <p className="text-[8px] font-medium uppercase tracking-wide text-slate-400">Protection</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <ScoreRing value={m.protectionScore} />
                      <span className="text-[8px] font-semibold text-emerald-300">Excellent</span>
                    </div>
                  </StatCard>
                  <StatCard>
                    <p className="text-[8px] font-medium uppercase tracking-wide text-slate-400">Exposures removed</p>
                    <p className="mt-1.5 text-2xl font-black leading-none text-white"><AnimatedNumber value={m.exposuresRemoved} /></p>
                    <p className="mt-0.5 text-[7px] text-emerald-300">↑ 23 this week</p>
                  </StatCard>
                  <StatCard>
                    <p className="text-[8px] font-medium uppercase tracking-wide text-slate-400">Threats blocked</p>
                    <p className="mt-1.5 text-2xl font-black leading-none text-white"><AnimatedNumber value={m.threatsBlocked} /></p>
                    <p className="mt-0.5 text-[7px] text-emerald-300">↑ 11 this week</p>
                  </StatCard>
                  <StatCard>
                    <p className="text-[8px] font-medium uppercase tracking-wide text-slate-400">Threat level</p>
                    <p className="mt-1.5 text-xl font-black leading-none text-emerald-400">Low</p>
                    <p className="mt-0.5 text-[7px] text-slate-500">All clear</p>
                  </StatCard>
                </motion.div>

                {/* activity + recent actions */}
                <motion.div variants={fade} className="mt-1.5 grid grid-cols-5 gap-1.5">
                  <div className="col-span-3 rounded-xl border border-white/8 bg-white/[0.03] p-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-[9px] font-semibold text-white">Protection activity</p>
                      <span className="text-[8px] font-semibold text-emerald-300">↑ {trendPct}% this week</span>
                    </div>
                    <div className="mt-2 h-[72px]"><FlowLine values={m.chart} /></div>
                  </div>
                  <div className="col-span-2 rounded-xl border border-white/8 bg-white/[0.03] p-2.5">
                    <p className="text-[9px] font-semibold text-white">Recent actions</p>
                    <ul className="mt-1.5 space-y-1.5">
                      {m.actions.map((a) => (
                        <li key={a.label} className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-2.5 w-2.5 shrink-0 text-emerald-400" />
                          <span className="min-w-0 flex-1 truncate text-[8px] text-slate-200">{a.label}</span>
                          <span className={`h-1 w-1 shrink-0 rounded-full ${TONE_DOT[a.tone]}`} />
                          <span className="shrink-0 text-[7px] text-slate-500">{a.ago}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>

                {/* protection coverage */}
                <motion.div variants={fade} className="mt-2 rounded-xl border border-white/8 bg-white/[0.03] p-2.5">
                  <p className="text-[9px] font-semibold text-white">Protection coverage</p>
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
                    {([["Identity", 96], ["Family", 88], ["Devices", 92], ["Accounts", 84]] as [string, number][]).map(([label, pct]) => (
                      <div key={label} className="flex items-center gap-2">
                        <span className="w-12 shrink-0 text-[8px] text-slate-400">{label}</span>
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/8">
                          <motion.span
                            className="block h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400"
                            initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.8, duration: 1, ease: "easeOut" }}
                          />
                        </span>
                        <span className="w-6 shrink-0 text-right text-[8px] font-semibold text-slate-300">{pct}%</span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* protection status row */}
                <motion.div variants={fade} className="mt-2 grid grid-cols-4 gap-1.5">
                  {["Monitoring Active", "Auto Removals", "Identity Secured", "Family Protected"].map((s) => (
                    <div key={s} className="flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/[0.02] px-2 py-1.5">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                      <span className="truncate text-[7.5px] font-medium text-slate-300">{s}</span>
                    </div>
                  ))}
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
