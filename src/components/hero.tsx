import Link from "next/link";
import { ShieldCheck, PlayCircle, Check } from "lucide-react";
import { HeroStage } from "@/components/hero/hero-stage";
import { demoHeroMetrics } from "@/components/hero/metrics";

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
        className="pointer-events-none absolute inset-x-0 -top-40 h-[420px] bg-[radial-gradient(55%_100%_at_62%_0%,rgba(99,102,241,0.10),transparent_72%)]"
      />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-6 px-6 pb-10 pt-16 lg:grid-cols-12 lg:gap-x-10 lg:pb-20 lg:pt-28">
        {/* LEFT — copy */}
        <div className="relative z-10 lg:col-span-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-elevated/70 px-3 py-1 text-xs font-medium text-brand-fg backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
            One platform · every layer of digital risk
          </span>

          <h1 className="mt-6 text-4xl font-bold leading-[1.06] tracking-tight text-white sm:text-5xl xl:text-[3.75rem]">
            The Digital Risk{" "}
            <span className="bg-gradient-to-r from-brand-fg via-brand to-brand-fg bg-clip-text text-transparent">
              Operating System.
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-400">
            Protect individuals, families, executives, politicians, brands and businesses from
            online exposure, reputation attacks, identity threats, doxxing and digital risk —
            discovered, removed and monitored automatically.
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

        {/* RIGHT — 3-layer interactive hero: globe + network + floating dashboard */}
        <div className="relative lg:col-span-7">
          <HeroStage metrics={demoHeroMetrics()} />
        </div>
      </div>

      {/* Gradient section divider into the page */}
      <div aria-hidden className="h-px w-full bg-gradient-to-r from-transparent via-brand/45 to-transparent" />
    </section>
  );
}
