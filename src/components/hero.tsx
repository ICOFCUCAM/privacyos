import Link from "next/link";
import { ShieldCheck, PlayCircle, Check } from "lucide-react";

const trust = [
  "AI-Powered Monitoring",
  "24/7 Autonomous Protection",
  "Data Broker Removal",
  "Dark Web Intelligence",
];

// The asset is now background-free (transparent), so it integrates directly —
// no frame, no mask. A soft drop-shadow gives it depth on the page.
const render: React.CSSProperties = {
  filter: "drop-shadow(0 24px 60px rgba(79,70,229,0.4))",
};

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-4 px-6 pb-8 pt-16 lg:grid-cols-12 lg:gap-0 lg:pb-16 lg:pt-24">
        {/* LEFT — copy */}
        <div className="relative z-10 lg:col-span-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-elevated/70 px-3 py-1 text-xs font-medium text-brand-fg backdrop-blur">
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

        {/* RIGHT — the product render, blended into the page (no frame) */}
        <div className="relative lg:col-span-7">
          {/* Ambient global-network lighting behind the asset (extends past it) */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 -z-0 h-[150%] w-[150%] -translate-x-1/2 -translate-y-1/2"
          >
            <div className="animate-pulse-glow absolute inset-[12%] rounded-full bg-brand/15 blur-3xl" />
            <div className="animate-spin-slow absolute inset-[6%] rounded-full border border-brand/10" />
            <div className="animate-spin-slow-rev absolute inset-[20%] rounded-full border border-brand/10" />
          </div>

          {/* Background-free render — integrates directly, bleeds under the copy */}
          <div className="hero-float relative z-10 lg:-ml-10 lg:-mr-12">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <picture>
              <source srcSet="/hero-dashboard.webp" type="image/webp" />
              <img
                src="/hero-dashboard.png"
                alt="PrivacyOS — live digital risk command center over a global intelligence network"
                className="w-full select-none"
                style={render}
                draggable={false}
              />
            </picture>
          </div>
        </div>
      </div>

      {/* Soft transition into the social-proof bar */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-[88px] h-32 bg-gradient-to-b from-transparent to-bg" />

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
