import Link from "next/link";
import {
  ShieldCheck,
  PlayCircle,
  Check,
  Radar,
  Trash2,
  Bot,
  AlertTriangle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/ui";

const trust = [
  "AI-Powered Monitoring",
  "24/7 Autonomous Protection",
  "Data Broker Removal",
  "Dark Web Intelligence",
];

interface Callout {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: string;
  pos: string;
  delay: string;
}

const callouts: Callout[] = [
  { icon: Radar, value: "126", label: "Exposures Found", tone: "text-brand-fg", pos: "-left-6 top-10 sm:-left-10", delay: "0s" },
  { icon: ShieldCheck, value: "38", label: "Risks Blocked", tone: "text-risk-low", pos: "-left-4 bottom-24 sm:-left-12", delay: "1.1s" },
  { icon: Trash2, value: "14", label: "Removal Requests Active", tone: "text-risk-medium", pos: "-right-4 top-24 sm:-right-10", delay: "0.5s" },
  { icon: Bot, value: "8", label: "AI Agents Online", tone: "text-risk-low", pos: "-right-2 bottom-16 sm:-right-8", delay: "1.6s" },
  { icon: AlertTriangle, value: "Dark Web", label: "Match Detected", tone: "text-risk-critical", pos: "right-1/4 -bottom-6", delay: "0.8s" },
];

function CalloutCard({ c }: { c: Callout }) {
  const Icon = c.icon;
  return (
    <div
      className={cn(
        "callout-float absolute z-20 hidden items-center gap-2.5 rounded-xl border border-border/80 bg-bg-elevated/80 px-3.5 py-2.5 shadow-2xl backdrop-blur-md md:flex",
        c.pos,
      )}
      style={{ animationDelay: c.delay }}
    >
      <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-white/5", c.tone)}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="leading-tight">
        <p className={cn("text-sm font-bold", c.tone)}>{c.value}</p>
        <p className="text-[11px] text-slate-400">{c.label}</p>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background intelligence network */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {/* Glowing globe behind the dashboard */}
        <div className="absolute right-[5%] top-1/2 h-[820px] w-[820px] -translate-y-1/2 lg:right-[18%]">
          <div className="animate-pulse-glow absolute inset-0 rounded-full bg-brand/20 blur-3xl" />
          <div className="animate-spin-slow absolute inset-0 rounded-full border border-brand/20" />
          <div className="animate-spin-slow-rev absolute inset-[8%] rounded-full border border-brand/15" />
          <div className="absolute inset-[16%] rounded-full border border-brand/10" />
          <div className="absolute inset-[24%] rounded-full border border-brand/10" />
          {/* orbiting nodes */}
          <div className="animate-spin-slow absolute inset-0">
            <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-brand-fg shadow-[0_0_12px] shadow-brand" />
            <span className="absolute bottom-[10%] right-[8%] h-1.5 w-1.5 rounded-full bg-brand-fg/70" />
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-bg/40 to-bg" />
      </div>

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-6 py-20 lg:grid-cols-12 lg:py-28">
        {/* LEFT — copy */}
        <div className="lg:col-span-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-elevated px-3 py-1 text-xs font-medium text-brand-fg">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
            The Operating System for Digital Privacy
          </span>

          <h1 className="mt-6 text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl xl:text-6xl">
            Protect Your Entire{" "}
            <span className="bg-gradient-to-r from-brand-fg to-brand bg-clip-text text-transparent">
              Digital Life.
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-lg text-slate-400">
            PrivacyOS discovers, monitors, analyzes, and continuously defends your digital
            presence across search engines, data brokers, social media, dark web sources,
            and AI-generated threats.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard/assistant"
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand/90"
            >
              <ShieldCheck className="h-4 w-4" /> Get Protected
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-semibold text-slate-200 transition hover:bg-bg-elevated"
            >
              <PlayCircle className="h-4 w-4" /> Watch Demo
            </Link>
          </div>

          <ul className="mt-8 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {trust.map((t) => (
              <li key={t} className="flex items-center gap-2 text-sm text-slate-300">
                <Check className="h-4 w-4 shrink-0 text-risk-low" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* RIGHT — floating dashboard */}
        <div className="relative lg:col-span-7">
          <div className="hero-float relative mx-auto w-full max-w-[1200px]">
            {/* glow */}
            <div aria-hidden className="absolute -inset-6 rounded-3xl bg-brand/25 blur-3xl" />
            <div className="hero-tilt relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/hero-dashboard.png"
                alt="PrivacyOS dashboard — live digital risk overview"
                className="relative z-10 w-full rounded-xl border border-white/10 shadow-[0_40px_120px_-20px_rgba(99,102,241,0.55)] ring-1 ring-white/5"
              />
            </div>
            {callouts.map((c) => (
              <CalloutCard key={c.label} c={c} />
            ))}
          </div>
        </div>
      </div>

      {/* Social proof bar */}
      <div className="relative border-y border-border bg-bg-subtle/40">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 py-8 sm:grid-cols-4">
          {[
            { v: "200M+", l: "Threats Analyzed" },
            { v: "50M+", l: "Broker Records Monitored" },
            { v: "1.2M+", l: "Users Protected" },
            { v: "24/7", l: "AI Monitoring" },
          ].map((s) => (
            <div key={s.l} className="text-center">
              <p className="text-2xl font-bold text-white sm:text-3xl">{s.v}</p>
              <p className="mt-1 text-xs text-slate-400 sm:text-sm">{s.l}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
