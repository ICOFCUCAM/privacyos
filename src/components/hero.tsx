import Link from "next/link";
import { ShieldCheck, PlayCircle, Check } from "lucide-react";
import { HeroScan } from "@/components/hero-scan";

const trust = [
  "AI-Powered Monitoring",
  "24/7 Autonomous Protection",
  "Data Broker Removal",
  "Dark Web Intelligence",
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Ambient top light for depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 h-[420px] bg-[radial-gradient(60%_100%_at_60%_0%,rgba(99,102,241,0.16),transparent_70%)]"
      />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-6 px-6 pb-10 pt-16 lg:grid-cols-12 lg:gap-x-10 lg:pb-20 lg:pt-28">
        {/* LEFT — copy */}
        <div className="relative z-10 lg:col-span-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-elevated/70 px-3 py-1 text-xs font-medium text-brand-fg backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
            Autonomous protection for your digital life
          </span>

          <h1 className="mt-6 text-4xl font-bold leading-[1.06] tracking-tight text-white sm:text-5xl xl:text-[3.75rem]">
            Protect Your Entire{" "}
            <span className="bg-gradient-to-r from-brand-fg via-brand to-brand-fg bg-clip-text text-transparent">
              Digital Life.
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-400">
            We find what&rsquo;s exposed about you across data brokers, breaches, the dark web,
            search and social — then remove it and keep watching, automatically. You get peace
            of mind; we do the work.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/scan"
              className="group inline-flex items-center gap-2 rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition hover:bg-brand/90 hover:shadow-brand/40"
            >
              <ShieldCheck className="h-4 w-4" /> Run a Free Exposure Scan
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-bg-elevated/40 px-6 py-3 text-sm font-semibold text-slate-200 backdrop-blur transition hover:bg-bg-elevated"
            >
              <PlayCircle className="h-4 w-4" /> See protection plans
            </Link>
          </div>
          <p className="mt-3 text-xs text-slate-500">No signup, no card — see what&rsquo;s exposed in under a minute.</p>

          <ul className="mt-9 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {trust.map((t) => (
              <li key={t} className="flex items-center gap-2 text-sm text-slate-300">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-risk-low/15">
                  <Check className="h-3 w-3 text-risk-low" />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* RIGHT — live exposure scan (the signature moment) */}
        <div className="relative lg:col-span-7">
          {/* Layered intelligence-network lighting */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 -z-0 h-[155%] w-[155%] -translate-x-1/2 -translate-y-1/2"
          >
            {/* wide soft halo */}
            <div className="animate-pulse-glow absolute inset-[14%] rounded-full bg-brand/16 blur-3xl" />
            {/* tighter bright core */}
            <div className="absolute inset-[30%] rounded-full bg-brand/25 blur-2xl" />
            {/* aurora wash */}
            <div
              className="absolute inset-0 opacity-50 blur-2xl"
              style={{
                background:
                  "conic-gradient(from 210deg at 55% 45%, rgba(99,102,241,0.18), transparent 35%, rgba(165,180,252,0.12) 60%, transparent 85%)",
              }}
            />
          </div>

          <div className="relative z-10 lg:px-6">
            <HeroScan />
          </div>
        </div>
      </div>

      {/* Soft transition into the social-proof bar */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-[88px] h-32 bg-gradient-to-b from-transparent to-bg"
      />

      {/* Gradient section divider */}
      <div aria-hidden className="h-px w-full bg-gradient-to-r from-transparent via-brand/45 to-transparent" />

      {/* Social proof bar */}
      <div className="relative border-b border-border bg-bg-subtle/40">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 py-8 sm:grid-cols-4">
          {[
            { v: "8", l: "Autonomous AI Agents" },
            { v: "29", l: "Security Data Models" },
            { v: "24/7", l: "Continuous Monitoring" },
            { v: "Multi-Layer", l: "Risk Intelligence" },
          ].map((s) => (
            <div key={s.l} className="text-center">
              <p className="bg-gradient-to-b from-white to-slate-400 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl">
                {s.v}
              </p>
              <p className="mt-1 text-xs text-slate-400 sm:text-sm">{s.l}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
