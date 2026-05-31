import Link from "next/link";
import {
  Search, Brain, Zap, ArrowUpRight, Eye, ArrowRight, Bot,
} from "lucide-react";
import { buttonClasses } from "@/components/ui";

/**
 * Dependency-free landing visuals — premium SVG schematics that give the
 * homepage visual rhythm between text sections. No images required; everything
 * renders crisp at any size and matches the product's dark theme.
 */

/* ── The moat band: autonomous agents + Digital Risk OS, front and center ─── */

export function MoatBand() {
  return (
    <section className="relative overflow-hidden border-y border-border bg-bg-elevated/30">
      {/* ambient glow */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-64 w-[40rem] -translate-x-1/2 rounded-full bg-brand/10 blur-3xl" />
      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 py-24 lg:grid-cols-2">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-fg">The Moat</span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Anyone can remove a broker listing.
            <span className="block text-brand-fg">Few can run an autonomous protection platform.</span>
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            PrivacyOS isn&apos;t a tool — it&apos;s a Digital Risk Operating System driven by a fleet of
            autonomous AI agents that detect, decide, act and escalate around the clock.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <Link href="/dashboard" className={buttonClasses("primary", "lg")}>
              See it live <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/pricing" className={buttonClasses("secondary", "lg")}>
              Explore plans
            </Link>
          </div>
        </div>
        <AgentWorkflowDiagram />
      </div>
    </section>
  );
}

/* ── AI agent workflow diagram (detect → decide → act → escalate → monitor) ─ */

const flow = [
  { icon: Search, label: "Detect", sub: "Scan every surface", color: "#94a3b8" },
  { icon: Brain, label: "Decide", sub: "Assess & prioritize", color: "#6366f1" },
  { icon: Zap, label: "Act", sub: "Remediate autonomously", color: "#22c55e" },
  { icon: ArrowUpRight, label: "Escalate", sub: "Only when needed", color: "#f97316" },
  { icon: Eye, label: "Monitor", sub: "Watch for recurrence", color: "#eab308" },
];

export function AgentWorkflowDiagram() {
  return (
    <div className="rounded-2xl border border-border bg-bg-elevated/70 p-6 backdrop-blur">
      <div className="mb-5 flex items-center gap-2">
        <Bot className="h-4 w-4 text-brand-fg" />
        <span className="text-sm font-semibold text-white">Autonomous response workflow</span>
      </div>
      <div className="flex items-stretch justify-between gap-1">
        {flow.map((step, i) => (
          <div key={step.label} className="flex flex-1 items-center">
            <div className="flex flex-1 flex-col items-center text-center">
              <span
                className="flex h-11 w-11 items-center justify-center rounded-xl ring-1"
                style={{ backgroundColor: `${step.color}1a`, borderColor: `${step.color}55`, color: step.color }}
              >
                <step.icon className="h-5 w-5" />
              </span>
              <span className="mt-2 text-xs font-semibold text-white">{step.label}</span>
              <span className="mt-0.5 hidden text-[10px] leading-tight text-slate-500 sm:block">{step.sub}</span>
            </div>
            {i < flow.length - 1 && (
              <ArrowRight className="mx-0.5 h-3.5 w-3.5 shrink-0 text-slate-600" />
            )}
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between rounded-lg border border-border bg-bg-subtle/50 px-3 py-2">
        <span className="inline-flex items-center gap-2 text-xs text-slate-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-risk-low opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-risk-low" />
          </span>
          13 agents running
        </span>
        <span className="text-xs font-semibold text-risk-low">~90% handled autonomously</span>
      </div>
    </div>
  );
}

/* ── Exposure-intelligence graphic (radial hub & spokes being neutralized) ── */

const spokes = [
  { label: "Data Brokers", angle: -90, color: "#ef4444" },
  { label: "Dark Web", angle: -38, color: "#f97316" },
  { label: "Social Media", angle: 14, color: "#eab308" },
  { label: "Search Engines", angle: 66, color: "#6366f1" },
  { label: "Public Records", angle: 118, color: "#22c55e" },
  { label: "Synthetic Media", angle: 170, color: "#ef4444" },
  { label: "News & Press", angle: 222, color: "#eab308" },
];

export function ExposureIntelligenceGraphic({ size = 360 }: { size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 56;
  const rad = (deg: number) => (deg * Math.PI) / 180;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full" style={{ maxWidth: size }} role="img" aria-label="Exposure intelligence across sources">
      {/* rings */}
      {[0.45, 0.72, 1].map((f, i) => (
        <circle key={i} cx={cx} cy={cy} r={r * f} fill="none" stroke="#1f2430" strokeWidth="1" />
      ))}
      {/* spokes + nodes */}
      {spokes.map((s) => {
        const x = cx + Math.cos(rad(s.angle)) * r;
        const y = cy + Math.sin(rad(s.angle)) * r;
        const lx = cx + Math.cos(rad(s.angle)) * (r + 6);
        const ly = cy + Math.sin(rad(s.angle)) * (r + 6);
        const left = lx < cx;
        return (
          <g key={s.label}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke={s.color} strokeOpacity="0.4" strokeWidth="1.5" />
            <circle cx={x} cy={y} r="6" fill={s.color} fillOpacity="0.25" stroke={s.color} strokeWidth="1.5" />
            <text x={left ? lx - 8 : lx + 8} y={ly} textAnchor={left ? "end" : "start"} dominantBaseline="middle" className="fill-slate-400 text-[9px]">
              {s.label}
            </text>
          </g>
        );
      })}
      {/* subject hub */}
      <circle cx={cx} cy={cy} r="26" fill="#6366f1" fillOpacity="0.15" stroke="#6366f1" strokeWidth="2" />
      <circle cx={cx} cy={cy} r="8" fill="#6366f1" />
      <text x={cx} y={cy + 42} textAnchor="middle" className="fill-white text-[10px] font-semibold">Your identity</text>
    </svg>
  );
}
