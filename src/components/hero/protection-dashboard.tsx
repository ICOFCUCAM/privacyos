"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useMotionValue, animate as animateMv } from "framer-motion";
import { ShieldCheck, Trash2, Crosshair, Users, Fingerprint, Radar, CheckCircle2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { demoHeroMetrics, type HeroMetrics } from "./metrics";

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

/* ── flowing protection-activity line ─────────────────────────────────────── */
function smoothPath(values: number[], w: number, h: number, pad = 3) {
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
  const W = 150, H = 46;
  const p = smoothPath(values, W, H);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="flowfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={p.area} fill="url(#flowfill)" />
      <motion.path
        d={p.line} fill="none" stroke="#a5b4fc" strokeWidth="1.6" strokeLinecap="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4, ease: "easeInOut", delay: 0.4 }}
      />
      {/* flowing signal marching along the line */}
      <motion.path
        d={p.line} fill="none" stroke="#e0e7ff" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="2 10"
        animate={{ strokeDashoffset: [0, -48] }} transition={{ duration: 2.4, ease: "linear", repeat: Infinity }}
        opacity={0.8}
      />
      <circle cx={p.endX} cy={p.endY} r="2.4" fill="#e0e7ff" />
      <circle cx={p.endX} cy={p.endY} r="2.4" fill="#a5b4fc">
        <animate attributeName="r" values="2.4;6;2.4" dur="2.2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.7;0;0.7" dur="2.2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/* ── score ring (dominant) ────────────────────────────────────────────────── */
function ScoreRing({ value }: { value: number }) {
  const [score, setScore] = useState(0);
  useEffect(() => {
    const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { setScore(value); return; }
    let raf = 0; const start = performance.now();
    const tick = (now: number) => { const t = Math.min(1, (now - start) / 1500); setScore(Math.round(value * (1 - Math.pow(1 - t, 3)))); if (t < 1) raf = requestAnimationFrame(tick); };
    const to = setTimeout(() => { raf = requestAnimationFrame(tick); }, 400);
    return () => { clearTimeout(to); cancelAnimationFrame(raf); };
  }, [value]);
  return (
    <div className="relative grid h-[68px] w-[68px] place-items-center">
      <svg viewBox="0 0 36 36" className="h-[68px] w-[68px] -rotate-90">
        <circle cx="18" cy="18" r="15.915" fill="none" stroke="currentColor" strokeWidth="2.6" className="text-white/10" />
        <circle cx="18" cy="18" r="15.915" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"
          className="text-emerald-400 transition-[stroke-dasharray] duration-300" strokeDasharray={`${score} 100`} />
      </svg>
      <div className="absolute text-center">
        <p className="text-xl font-black leading-none text-white">{score}</p>
        <p className="text-[7px] uppercase tracking-wide text-slate-500">/100</p>
      </div>
    </div>
  );
}

function PrimaryStat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-2.5">
      <div className="flex items-center gap-1.5 text-[8.5px] font-medium uppercase tracking-wide text-slate-400">
        <Icon className="h-3 w-3 text-indigo-300/70" /> {label}
      </div>
      <p className="mt-1 text-2xl font-black leading-none text-white"><AnimatedNumber value={value} /></p>
    </div>
  );
}

function StatusChip({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/[0.02] px-2 py-1.5">
      <Icon className="h-3 w-3 shrink-0 text-indigo-300/70" />
      <span className="min-w-0 flex-1 truncate text-[8.5px] font-medium text-slate-200">{label}</span>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
    </div>
  );
}

const fade = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

/**
 * Layer 2 — the floating "protection panel" (Apple Vision-Pro feel): layered
 * glass with thickness, edge highlight + reflection, left-forward perspective,
 * clear hierarchy (dominant Protection Score → primary outcomes → secondary
 * status), a flowing activity line, and outcome-emotion language.
 */
export function ProtectionDashboard({ metrics, flat = false }: { metrics?: HeroMetrics; flat?: boolean }) {
  const m = metrics ?? demoHeroMetrics();
  const trendPct = 12 + Math.round(m.chart[m.chart.length - 1] * 10);

  return (
    <div style={{ perspective: 2000 }} className="w-full">
      <motion.div
        initial={{ opacity: 0, rotateY: flat ? 0 : -16, rotateX: flat ? 0 : 5, y: 36 }}
        animate={{ opacity: 1, rotateY: flat ? 0 : -12, rotateX: flat ? 0 : 3, y: 0 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformStyle: "preserve-3d", transformOrigin: "left center" }}
        className="relative"
      >
        {/* thickness layer (behind, offset → physical depth) */}
        <div aria-hidden className="absolute -inset-0.5 translate-x-1.5 translate-y-2 rounded-[1.5rem] bg-black/50 blur-[2px]" />

        {/* the glass panel */}
        <div className="relative overflow-hidden rounded-[1.5rem] border border-white/12 bg-gradient-to-br from-[#0d1124]/90 via-[#0b0e1c]/92 to-[#080a14]/94 p-3.5 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.85)] ring-1 ring-white/5 backdrop-blur-2xl">
          {/* top edge highlight */}
          <div aria-hidden className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent" />
          {/* reflection sheen */}
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.10] via-transparent to-transparent" />
          {/* soft inner indigo edge */}
          <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[1.5rem] ring-1 ring-inset ring-indigo-400/10" />

          <motion.div
            variants={{ show: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } } }}
            initial="hidden" animate="show" className="relative"
          >
            {/* top bar */}
            <motion.div variants={fade} className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-tight text-white">
                <span className="flex h-4 w-4 items-center justify-center rounded bg-gradient-to-br from-indigo-500 to-indigo-400/80"><ShieldCheck className="h-2.5 w-2.5 text-white" /></span>
                Privacy<span className="text-indigo-300">OS</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-1.5 py-0.5 text-[8px] font-semibold text-emerald-300 ring-1 ring-emerald-400/20">
                <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" /></span>
                LIVE
              </span>
            </motion.div>

            <div className="mt-3 grid grid-cols-5 gap-3">
              {/* LEFT — hierarchy hero: protection score + status */}
              <div className="col-span-2 flex flex-col">
                <motion.div variants={fade} className="flex items-center gap-2.5">
                  <ScoreRing value={m.protectionScore} />
                  <div>
                    <p className="text-[13px] font-bold leading-tight text-white">You&rsquo;re<br />Protected</p>
                    <p className="mt-0.5 text-[8px] text-emerald-300">All systems active</p>
                  </div>
                </motion.div>
                <motion.div variants={fade} className="mt-3 space-y-1.5">
                  <StatusChip icon={Radar} label="Monitoring Active" />
                  <StatusChip icon={Fingerprint} label="Identity Secured" />
                  <StatusChip icon={Users} label="Family Protected" />
                </motion.div>
              </div>

              {/* RIGHT — activity + primary outcomes */}
              <div className="col-span-3 flex flex-col">
                <motion.div variants={fade} className="rounded-xl border border-white/8 bg-white/[0.03] p-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] font-semibold text-white">Protection activity</p>
                    <span className="text-[8px] font-semibold text-emerald-300">↑ {trendPct}% this week</span>
                  </div>
                  <div className="mt-1.5 h-12"><FlowLine values={m.chart} /></div>
                </motion.div>

                <motion.div variants={fade} className="mt-2 grid grid-cols-2 gap-2">
                  <PrimaryStat icon={Trash2} label="Exposures Removed" value={m.exposuresRemoved} />
                  <PrimaryStat icon={Crosshair} label="Threats Blocked" value={m.threatsBlocked} />
                </motion.div>

                <motion.div variants={fade} className="mt-2 flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.02] px-2.5 py-1.5">
                  <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-400" />
                  <span className="min-w-0 flex-1 truncate text-[8.5px] text-slate-300">{m.actions[1].label} · {m.actions[1].detail}</span>
                  <span className="shrink-0 text-[8px] text-slate-500">{m.actions[1].ago}</span>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
