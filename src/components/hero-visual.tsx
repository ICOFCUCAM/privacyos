"use client";

import { useEffect, useState } from "react";
import {
  LayoutDashboard, Radar, Fingerprint, Star, EyeOff, Activity, Scale, FileText, Settings,
  Search, Bell, Download, ShieldCheck, Lock, Globe, Users, ChevronDown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const nav: { icon: LucideIcon; label: string; active?: boolean }[] = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Radar, label: "Exposures" },
  { icon: Fingerprint, label: "Identity" },
  { icon: Star, label: "Reputation" },
  { icon: EyeOff, label: "Dark Web" },
  { icon: Activity, label: "Monitoring" },
  { icon: Scale, label: "Legal Center" },
  { icon: FileText, label: "Reports" },
  { icon: Settings, label: "Settings" },
];

const alerts: { dot: string; title: string; ago: string }[] = [
  { dot: "bg-risk-high", title: "New Data Broker Listing Found", ago: "2 min ago" },
  { dot: "bg-risk-medium", title: "Potential Identity Leak Detected", ago: "15 min ago" },
  { dot: "bg-brand", title: "Dark Web Credential Match", ago: "1 hour ago" },
  { dot: "bg-risk-medium", title: "Impersonation Attempt Detected", ago: "2 hours ago" },
];

const statusItems = ["Web Monitoring", "Dark Web Monitoring", "Identity Protection", "Reputation Monitoring"];

/** Animated privacy-score ring (counts up to 87 on mount). */
function ScoreRing() {
  const [score, setScore] = useState(0);
  useEffect(() => {
    const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { setScore(87); return; }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 1500);
      setScore(Math.round(87 * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    const t = setTimeout(() => { raf = requestAnimationFrame(tick); }, 400);
    return () => { clearTimeout(t); cancelAnimationFrame(raf); };
  }, []);
  return (
    <div className="relative grid h-[52px] w-[52px] place-items-center">
      <svg viewBox="0 0 36 36" className="h-[52px] w-[52px] -rotate-90">
        <circle cx="18" cy="18" r="15.915" fill="none" stroke="currentColor" strokeWidth="3" className="text-white/10" />
        <circle cx="18" cy="18" r="15.915" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
          className="text-risk-low transition-[stroke-dasharray] duration-300" strokeDasharray={`${score} 100`} />
      </svg>
      <div className="absolute text-center">
        <p className="text-[15px] font-black leading-none text-white">{score}</p>
      </div>
    </div>
  );
}

/**
 * The hero centerpiece: a live, coded tablet dashboard (matching the product
 * mock) floating in 3D in front of a wireframe globe, ringed by orbital paths
 * and floating security nodes. Replaces the flat PNG with a living UI.
 */
export function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-2xl">
      {/* ambient brand glow */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[150%] w-[150%] -translate-x-1/2 -translate-y-1/2">
        <div className="animate-pulse-glow absolute inset-[16%] rounded-full bg-brand/16 blur-3xl" />
        <div className="absolute inset-[32%] rounded-full bg-brand/25 blur-2xl" />
      </div>

      {/* wireframe globe (behind, top-right) */}
      <svg aria-hidden viewBox="0 0 200 200" className="pointer-events-none absolute -right-6 -top-10 -z-10 h-64 w-64 opacity-40 sm:h-72 sm:w-72">
        <defs>
          <radialGradient id="glb" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="100" cy="100" r="78" fill="url(#glb)" />
        <g fill="none" stroke="#818cf8" strokeWidth="0.6" opacity="0.6">
          <circle cx="100" cy="100" r="78" />
          {[78, 60, 38, 16].map((rx) => <ellipse key={`v${rx}`} cx="100" cy="100" rx={rx} ry="78" />)}
          {[60, 30].map((ry) => <ellipse key={`h${ry}`} cx="100" cy="100" rx="78" ry={ry} />)}
          <line x1="100" y1="22" x2="100" y2="178" />
        </g>
      </svg>

      {/* orbital rings */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2">
        <div className="animate-spin-slow h-[120%] w-[150%] rounded-[50%] border border-brand/20" style={{ aspectRatio: "2/1", width: "640px", height: "320px" }} />
      </div>
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2">
        <div className="animate-spin-slow-rev rounded-[50%] border border-brand-fg/15" style={{ width: "560px", height: "260px" }} />
      </div>

      {/* floating security nodes */}
      <Node icon={Lock} className="callout-float -top-4 left-1/3" />
      <Node icon={Globe} className="callout-float top-1/3 -left-5" style={{ animationDelay: "1.2s" }} />
      <Node icon={Users} className="callout-float top-1/2 -right-4" style={{ animationDelay: "0.6s" }} />
      <Node icon={ShieldCheck} className="callout-float -bottom-5 left-1/2" style={{ animationDelay: "1.8s" }} />

      {/* the tilted tablet */}
      <div className="hero-tilt relative z-10">
        <div className="rounded-[1.4rem] border border-white/10 bg-gradient-to-b from-[#10131f] to-[#0a0c15] p-1.5 shadow-2xl shadow-black/60 ring-1 ring-white/5">
          <div className="overflow-hidden rounded-[1.1rem] bg-[#0b0d17]">
            <div className="flex">
              {/* sidebar */}
              <aside className="hidden w-[26%] shrink-0 flex-col border-r border-white/5 bg-[#0d1019] p-3 sm:flex">
                <div className="flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-brand to-brand-fg/80"><ShieldCheck className="h-3 w-3 text-white" /></span>
                  <span className="text-[11px] font-bold text-white">Privacy<span className="text-brand-fg">OS</span></span>
                </div>
                <ul className="mt-4 space-y-0.5">
                  {nav.map((n) => (
                    <li key={n.label} className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[9px] ${n.active ? "bg-brand/15 text-white ring-1 ring-brand/25" : "text-slate-500"}`}>
                      <n.icon className={`h-2.5 w-2.5 ${n.active ? "text-brand-fg" : ""}`} /> {n.label}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto flex items-center gap-2 rounded-lg bg-white/[0.03] p-1.5 ring-1 ring-white/5">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-brand to-brand-fg/70 text-[8px] font-bold text-white">AJ</span>
                  <div className="min-w-0">
                    <p className="truncate text-[9px] font-semibold text-white">Alex Johnson</p>
                    <p className="truncate text-[7px] text-slate-500">Premium Plan</p>
                  </div>
                  <ChevronDown className="ml-auto h-2.5 w-2.5 text-slate-600" />
                </div>
              </aside>

              {/* main */}
              <main className="min-w-0 flex-1 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[12px] font-bold text-white">Dashboard Overview</p>
                    <p className="text-[8px] text-slate-500">Your digital protection status</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="grid h-5 w-5 place-items-center rounded-md bg-white/5 text-slate-400"><Search className="h-2.5 w-2.5" /></span>
                    <span className="relative grid h-5 w-5 place-items-center rounded-md bg-white/5 text-slate-400"><Bell className="h-2.5 w-2.5" /><span className="absolute -right-0 -top-0 h-1.5 w-1.5 rounded-full bg-risk-high" /></span>
                    <span className="hidden items-center gap-1 rounded-md bg-brand px-2 py-1 text-[8px] font-semibold text-white sm:inline-flex"><Download className="h-2.5 w-2.5" /> Download Report</span>
                  </div>
                </div>

                {/* stat cards */}
                <div className="mt-3 grid grid-cols-4 gap-1.5">
                  <Card label="Privacy Score">
                    <div className="flex items-center gap-1.5">
                      <ScoreRing />
                      <div><p className="text-[8px] font-semibold text-risk-low">Excellent</p><p className="text-[7px] text-slate-500">↑ 12 this week</p></div>
                    </div>
                  </Card>
                  <Card label="Exposures Found"><p className="text-xl font-black text-white">126</p><p className="text-[7px] text-risk-low">↓ 23 this week</p></Card>
                  <Card label="Risks Blocked"><p className="text-xl font-black text-white">38</p><p className="text-[7px] text-risk-low">↑ 11 this week</p></Card>
                  <Card label="Threat Level"><p className="text-lg font-black text-risk-low">Low</p><p className="text-[7px] text-slate-500">All clear</p></Card>
                </div>

                {/* chart + alerts */}
                <div className="mt-1.5 grid grid-cols-5 gap-1.5">
                  <div className="col-span-3 rounded-lg border border-white/5 bg-white/[0.02] p-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[9px] font-semibold text-white">Risk Activity</p>
                      <span className="flex items-center gap-0.5 rounded bg-white/5 px-1 py-0.5 text-[7px] text-slate-400">7 Days <ChevronDown className="h-2 w-2" /></span>
                    </div>
                    <svg viewBox="0 0 200 56" className="mt-1 h-16 w-full" preserveAspectRatio="none">
                      <defs><linearGradient id="ar" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity="0.5" /><stop offset="100%" stopColor="#6366f1" stopOpacity="0" /></linearGradient></defs>
                      <path d="M0,42 C20,38 30,20 50,24 C70,28 80,44 100,40 C120,36 130,14 150,18 C170,22 185,30 200,26 L200,56 L0,56 Z" fill="url(#ar)" />
                      <path d="M0,42 C20,38 30,20 50,24 C70,28 80,44 100,40 C120,36 130,14 150,18 C170,22 185,30 200,26" fill="none" stroke="#818cf8" strokeWidth="1.5" />
                      <path d="M0,48 C25,46 35,36 55,38 C80,40 95,50 120,46 C145,42 160,34 200,38" fill="none" stroke="#475569" strokeWidth="1" strokeDasharray="2 2" />
                    </svg>
                  </div>
                  <div className="col-span-2 rounded-lg border border-white/5 bg-white/[0.02] p-2">
                    <p className="text-[9px] font-semibold text-white">Recent Alerts</p>
                    <ul className="mt-1 space-y-1">
                      {alerts.map((a) => (
                        <li key={a.title} className="flex items-center gap-1.5">
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${a.dot}`} />
                          <span className="min-w-0 flex-1 truncate text-[7.5px] text-slate-300">{a.title}</span>
                          <span className="shrink-0 text-[6.5px] text-slate-600">{a.ago}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* protection status */}
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-white/5 bg-white/[0.02] px-2 py-1.5">
                  <span className="text-[8px] font-semibold text-white">Protection Status</span>
                  {statusItems.map((s) => (
                    <span key={s} className="inline-flex items-center gap-1 text-[7px] text-slate-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-risk-low" /> {s} <span className="text-risk-low">Active</span>
                    </span>
                  ))}
                </div>
              </main>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-1.5">
      <p className="text-[7px] uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Node({ icon: Icon, className, style }: { icon: LucideIcon; className?: string; style?: React.CSSProperties }) {
  return (
    <div style={style} className={`pointer-events-none absolute z-20 hidden lg:block ${className ?? ""}`}>
      <span className="grid h-9 w-9 place-items-center rounded-full border border-brand/30 bg-bg-elevated/80 text-brand-fg shadow-lg shadow-brand/20 backdrop-blur">
        <Icon className="h-4 w-4" />
      </span>
    </div>
  );
}
