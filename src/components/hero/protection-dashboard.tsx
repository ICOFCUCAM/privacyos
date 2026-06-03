"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useMotionValue, animate as animateMv } from "framer-motion";
import {
  ShieldCheck, Trash2, Crosshair, Users, Bot, CheckCircle2, Radar, Zap, BellRing,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { demoHeroMetrics, type HeroMetrics, type ActionTone } from "./metrics";

const TONE_DOT: Record<ActionTone, string> = {
  low: "bg-emerald-400",
  medium: "bg-violet-400",
  brand: "bg-brand-fg",
};

/** Count-up number driven by Framer Motion; reduced-motion shows the target. */
function AnimatedNumber({ value, format }: { value: number; format?: "score" | "number" }) {
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

  return (
    <span ref={ref}>
      {display.toLocaleString()}{format === "score" ? <span className="text-base text-slate-500">/100</span> : ""}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, format, accent }: {
  icon: LucideIcon; label: string; value: number; format?: "score" | "number"; accent?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-2.5 ${accent ? "border-brand/30 bg-brand/10" : "border-white/10 bg-white/[0.03]"}`}>
      <div className="flex items-center gap-1.5 text-[9px] font-medium uppercase tracking-wide text-slate-400">
        <Icon className={`h-3 w-3 ${accent ? "text-brand-fg" : "text-violet-300/80"}`} /> {label}
      </div>
      <p className="mt-1 text-xl font-black leading-none text-white">
        <AnimatedNumber value={value} format={format} />
      </p>
    </div>
  );
}

const card = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

/**
 * Layer 2 — the floating glass "protection tablet". Outcome-only (we are
 * protecting you), glassmorphism, with a left-forward perspective so it sits in
 * front of the globe. Framer Motion handles the staggered entrance + count-ups.
 */
export function ProtectionDashboard({ metrics, flat = false }: { metrics?: HeroMetrics; flat?: boolean }) {
  const m = metrics ?? demoHeroMetrics();
  const max = Math.max(...m.chart, 0.0001);

  return (
    <div style={{ perspective: 1800 }} className="w-full">
      <motion.div
        initial={{ opacity: 0, rotateY: flat ? 0 : -18, rotateX: flat ? 0 : 6, y: 40 }}
        animate={{ opacity: 1, rotateY: flat ? 0 : -12, rotateX: flat ? 0 : 3, y: 0 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformStyle: "preserve-3d", transformOrigin: "left center" }}
        className="relative rounded-[1.4rem] border border-white/12 bg-gradient-to-br from-white/[0.09] to-white/[0.02] p-3 shadow-2xl shadow-black/60 ring-1 ring-white/5 backdrop-blur-xl"
      >
        {/* glow edges */}
        <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[1.4rem] ring-1 ring-inset ring-brand/10" />
        <div aria-hidden className="pointer-events-none absolute -inset-px rounded-[1.4rem] bg-gradient-to-br from-brand/20 via-transparent to-transparent opacity-40 blur-[2px]" />

        <motion.div
          variants={{ show: { transition: { staggerChildren: 0.08, delayChildren: 0.25 } } }}
          initial="hidden"
          animate="show"
          className="relative"
        >
          {/* header */}
          <motion.div variants={card} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-brand-fg/80 ring-1 ring-white/10">
                <ShieldCheck className="h-3.5 w-3.5 text-white" />
              </span>
              <div>
                <p className="text-[11px] font-bold leading-none text-white">You&rsquo;re protected</p>
                <p className="mt-0.5 text-[8px] text-slate-400">PrivacyOS is working for you</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-1.5 py-0.5 text-[8px] font-semibold text-emerald-300 ring-1 ring-emerald-400/20">
              <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" /></span>
              LIVE
            </span>
          </motion.div>

          {/* outcome cards */}
          <motion.div variants={card} className="mt-3 grid grid-cols-3 gap-1.5">
            <StatCard icon={ShieldCheck} label="Protection" value={m.protectionScore} format="score" accent />
            <StatCard icon={Trash2} label="Exposures removed" value={m.exposuresRemoved} />
            <StatCard icon={Crosshair} label="Threats prevented" value={m.threatsPrevented} />
            <StatCard icon={Users} label="Family protected" value={m.familyProtected} />
            <StatCard icon={Bot} label="AI agents active" value={m.agentsActive} />
            <div className="flex flex-col justify-center rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
              <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">Status</p>
              <p className="mt-1 text-[11px] font-bold text-emerald-300">All clear</p>
            </div>
          </motion.div>

          {/* activity chart */}
          <motion.div variants={card} className="mt-1.5 rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
            <p className="text-[9px] font-semibold text-white">Protection activity</p>
            <div className="mt-2 flex h-12 items-end gap-1.5">
              {m.chart.map((v, i) => (
                <motion.div
                  key={i}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: 0.6 + i * 0.06, duration: 0.5, ease: "easeOut" }}
                  style={{ height: `${(v / max) * 100}%`, originY: 1 }}
                  className="flex-1 rounded-sm bg-gradient-to-t from-brand/40 to-brand-fg/90"
                />
              ))}
            </div>
          </motion.div>

          {/* recent actions */}
          <motion.div variants={card} className="mt-1.5 rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
            <p className="text-[9px] font-semibold text-white">Recent actions completed</p>
            <ul className="mt-1.5 space-y-1.5">
              {m.actions.slice(0, 4).map((a, i) => (
                <motion.li
                  key={a.label}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + i * 0.1, duration: 0.4 }}
                  className="flex items-center gap-2"
                >
                  <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-400" />
                  <span className="min-w-0 flex-1 truncate text-[9px] text-slate-200">{a.label}</span>
                  <span className={`h-1 w-1 shrink-0 rounded-full ${TONE_DOT[a.tone]}`} />
                  <span className="shrink-0 text-[8px] text-slate-500">{a.ago}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* bottom row */}
          <motion.div variants={card} className="mt-1.5 grid grid-cols-4 gap-1.5">
            {[
              { icon: Radar, label: "24/7 Monitoring" },
              { icon: Trash2, label: "Auto Removals" },
              { icon: Zap, label: "AI Protection" },
              { icon: BellRing, label: "Real-Time Alerts" },
            ].map((b) => (
              <div key={b.label} className="flex flex-col items-center gap-1 rounded-lg border border-white/10 bg-white/[0.02] px-1 py-1.5 text-center">
                <b.icon className="h-3 w-3 text-violet-300/80" />
                <span className="text-[7px] font-medium leading-tight text-slate-300">{b.label}</span>
                <span className="h-1 w-1 rounded-full bg-emerald-400" />
              </div>
            ))}
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
