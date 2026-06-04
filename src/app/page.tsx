import Link from "next/link";
import { ScanLine } from "lucide-react";
import { Hero } from "@/components/hero";
import { BrandMark } from "@/components/brand-mark";
import { TrustStrip, PersonaBand } from "@/components/landing-sections";
import {
  FreeAssessmentBand,
  PublicFigureProtection,
  OutcomeMetricsBand,
} from "@/components/landing-outcomes";
import {
  HighStakesBuyers,
  DetectionIsNotProtection,
  CapabilityMatrix,
} from "@/components/landing-platform";
import {
  ArchitectureEngine, ThreatSimulation, MissionControlShowcase, OneEngineNotTenTools,
} from "@/components/landing-cinematic";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Reveal } from "@/components/reveal";
import { getT } from "@/lib/i18n/server";
import { buttonClasses } from "@/components/ui";

export default async function LandingPage() {
  const t = await getT();
  return (
    <main id="content" className="bg-grid min-h-screen">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-bg/70 backdrop-blur-xl">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent" />
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <BrandMark size={34} wordmarkClass="text-xl" />
          <div className="flex items-center gap-1">
            <Link
              href="/pricing"
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
            >
              {t("marketing.pricing")}
            </Link>
            <Link
              href="/security"
              className="hidden rounded-lg px-3.5 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white sm:block"
            >
              {t("marketing.security")}
            </Link>
            <Link
              href="/login"
              className="hidden rounded-lg px-3.5 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white sm:block"
            >
              Sign in
            </Link>
            <LanguageSwitcher compact />
            <Link href="/scan" className={buttonClasses("primary", "md", "shadow-lg shadow-brand/25 hover:shadow-brand/40")}>
              <ScanLine className="h-4 w-4" /> Free scan
            </Link>
          </div>
        </div>
      </header>

      {/* 1 — HERO: the protection promise */}
      <Hero />

      {/* 2 — ONE ENGINE, NOT TEN TOOLS (cinematic: fragmented silos vs one engine) */}
      <Reveal><OneEngineNotTenTools /></Reveal>

      <div aria-hidden className="section-seam" />

      {/* 3 — WHO WE PROTECT (buyer categories, not products) */}
      <Reveal><PersonaBand /></Reveal>

      {/* 4 — THE OPERATING SYSTEM (cinematic architecture: domains → one engine) */}
      <ArchitectureEngine />

      {/* 5 — DETECTION IS NOT PROTECTION (the outcome thesis: we act) */}
      <Reveal><DetectionIsNotProtection /></Reveal>

      <div aria-hidden className="section-seam" />

      {/* 6 — WATCH THE PLATFORM WORK (live, animated threat-response cascade) */}
      <ThreatSimulation />

      {/* 6 — BUILT FOR PEOPLE WHO CANNOT AFFORD EXPOSURE (high-stakes buyers) */}
      <Reveal><HighStakesBuyers /></Reveal>

      {/* 7 — PUBLIC FIGURES & POLITICAL PROTECTION (executive depth) */}
      <Reveal><PublicFigureProtection /></Reveal>

      {/* 8 — HEAD-TO-HEAD CAPABILITY MATRIX (the category, proven row by row) */}
      <Reveal><CapabilityMatrix /></Reveal>

      {/* 9 — MISSION CONTROL (cinematic: the living command center, in action) */}
      <MissionControlShowcase />

      {/* 10 — REAL OUTCOMES (customer outcomes, not engineering metrics) */}
      <Reveal><OutcomeMetricsBand /></Reveal>

      {/* 9 — FREE EXPOSURE SCAN (the conversion engine) */}
      <Reveal><FreeAssessmentBand /></Reveal>

      {/* 9 — TRUST: security, privacy, encryption, compliance */}
      <Reveal><TrustStrip /></Reveal>

      {/* 10 — FINAL CTA */}
      <Reveal className="mx-auto max-w-5xl px-6 py-24">
        <div className="relative overflow-hidden rounded-[2rem] border border-brand/30 bg-gradient-to-b from-brand/10 via-bg-elevated/40 to-bg-elevated/20 px-6 py-16 text-center shadow-2xl shadow-brand/15 ring-1 ring-white/5">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-28 h-56 bg-[radial-gradient(50%_100%_at_50%_0%,rgba(99,102,241,0.28),transparent_70%)]" />
          <div aria-hidden className="grain-overlay" />
          <span aria-hidden className="signal-line pointer-events-none absolute inset-x-[12%] top-0 h-px" />
          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Take back control of your <span className="text-sheen">digital life.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-slate-300">
              See what&apos;s exposed, remove it, and let PrivacyOS defend you around the clock — automatically.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/scan" className={buttonClasses("primary", "lg")}>
                <ScanLine className="h-4 w-4" /> Run my free exposure scan
              </Link>
              <Link href="/pricing" className={buttonClasses("secondary", "lg")}>
                View Pricing
              </Link>
            </div>
            <p className="mt-4 text-xs text-slate-500">Free · no signup · see what&apos;s exposed in under a minute.</p>
          </div>
        </div>
      </Reveal>

      <footer className="relative overflow-hidden border-t border-border bg-bg-subtle/30">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-24 h-48 bg-[radial-gradient(45%_100%_at_50%_0%,rgba(99,102,241,0.08),transparent_70%)]" />
        <div className="relative mx-auto max-w-6xl px-6 py-14">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:grid-cols-5">
            <div className="col-span-2 lg:col-span-1">
              <BrandMark size={26} wordmarkClass="text-base" href={null} />
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-400">
                Autonomous protection for your privacy, identity, reputation and family — working on your behalf, around the clock.
              </p>
            </div>
            {[
              { h: "Protection", links: [["Free exposure scan", "/scan"], ["Protection plans", "/pricing"], ["Sign in", "/login"]] },
              { h: "For", links: [["Individuals & families", "/pricing"], ["Creators", "/pricing"], ["Executives", "/pricing"], ["Businesses", "/pricing"]] },
              { h: "Platform", links: [["How the technology works", "/platform"], ["Security & trust", "/security"], ["Dashboard", "/dashboard"]] },
              { h: "Trust", links: [["Security", "/security"], ["GDPR & CCPA", "/security"]] },
            ].map((col) => (
              <div key={col.h}>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{col.h}</p>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map(([label, href]) => (
                    <li key={`${col.h}-${label}`}>
                      <Link href={href} className="group inline-flex items-center gap-1 text-sm text-slate-400 transition hover:text-white">
                        <span className="h-px w-0 bg-brand-fg transition-all duration-300 group-hover:w-3" />
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border/70 pt-6 sm:flex-row">
            <p className="text-xs text-slate-500">© {new Date().getFullYear()} PrivacyOS · Autonomous digital protection.</p>
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5">
              {["GDPR", "CCPA", "SOC 2", "ISO 27001"].map((b) => (
                <span key={b} className="rounded-md border border-border/70 bg-bg-elevated/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-400">{b}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
