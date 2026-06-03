import Link from "next/link";
import type { Metadata } from "next";
import { ScanLine } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import {
  AgentsSection,
  ActivitySection,
  EcosystemSection,
  EnterpriseSection,
} from "@/components/landing-sections";
import { MoatBand } from "@/components/landing-visuals";
import { SecurityArchitecture } from "@/components/security-architecture";
import { buttonClasses } from "@/components/ui";

export const metadata: Metadata = {
  title: "The Platform — PrivacyOS",
  description:
    "How PrivacyOS works under the hood: the autonomous agent fleet, the always-on intelligence stream, the integrated OS suites, enterprise infrastructure, the automation moat, and the security architecture.",
};

/**
 * The technical / product deep-dive — relocated off the outcome-first homepage.
 * Reuses the existing platform sections intact, for the technically curious,
 * enterprise buyers, and investors.
 */
export default function PlatformPage() {
  return (
    <main id="content" className="bg-grid min-h-screen">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-bg/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <BrandMark size={34} wordmarkClass="text-xl" />
          <div className="flex items-center gap-1">
            <Link href="/pricing" className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-300 transition hover:bg-bg-elevated hover:text-white">Pricing</Link>
            <Link href="/security" className="hidden rounded-lg px-3.5 py-2 text-sm font-medium text-slate-300 transition hover:bg-bg-elevated hover:text-white sm:block">Security</Link>
            <Link href="/scan" className={buttonClasses("primary", "md")}>
              <ScanLine className="h-4 w-4" /> Free scan
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 pb-6 pt-16 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-fg">
          The platform
        </span>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
          The machinery behind the protection.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-400">
          You never have to touch it — but for the curious, here&rsquo;s how PrivacyOS discovers, removes
          and defends autonomously: the agent fleet, the always-on intelligence, the integrated suites,
          and the security it&rsquo;s all built on.
        </p>
      </section>

      <AgentsSection />
      <ActivitySection />
      <EcosystemSection />
      <MoatBand />
      <EnterpriseSection />
      <SecurityArchitecture />

      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Protection, not a control panel.</h2>
        <p className="mx-auto mt-3 max-w-xl text-slate-400">
          All of this runs on your behalf. Start with a free exposure scan and see what&rsquo;s exposed about you.
        </p>
        <Link href="/scan" className={`${buttonClasses("primary", "lg")} mt-6`}>
          <ScanLine className="h-4 w-4" /> Run my free exposure scan
        </Link>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-slate-500">
        PrivacyOS — Autonomous digital protection.
      </footer>
    </main>
  );
}
