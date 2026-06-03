import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import {
  Shield,
  Search,
  Scale,
  Eye,
  Bot,
  Building2,
  Users,
  ScanFace,
} from "lucide-react";
import { Hero } from "@/components/hero";
import {
  TrustStrip,
  AgentsSection,
  ActivitySection,
  EcosystemSection,
  EnterpriseSection,
  OutcomesBand,
  PersonaBand,
} from "@/components/landing-sections";
import { MoatBand } from "@/components/landing-visuals";
import { SecurityArchitecture } from "@/components/security-architecture";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getT } from "@/lib/i18n/server";
import { buttonClasses } from "@/components/ui";

const modules = [
  { icon: Search, title: "Privacy Discovery", desc: "Every exposure across the web, brokers and breaches." },
  { icon: Shield, title: "Identity Protection", desc: "Defends names, emails, phones, addresses, credentials." },
  { icon: Eye, title: "Dark Web Monitoring", desc: "Real-time alerts on credential leaks." },
  { icon: ScanFace, title: "Deepfake Detection", desc: "Catches synthetic media, voice clones, impersonation." },
  { icon: Scale, title: "Legal Automation", desc: "Auto-drafts GDPR/CCPA requests and takedowns." },
  { icon: Building2, title: "Business Intelligence", desc: "Credential leaks, exposed assets, brand abuse." },
  { icon: Users, title: "Family & Executive", desc: "VIP-grade protection for leaders and families." },
  { icon: Bot, title: "Autonomous Agents", desc: "A coordinated fleet defending you 24/7." },
];

export default async function LandingPage() {
  const t = await getT();
  return (
    <main id="content" className="bg-grid min-h-screen">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-bg/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <BrandMark size={34} wordmarkClass="text-xl" />
          <div className="flex items-center gap-1">
            <Link
              href="/security"
              className="hidden rounded-lg px-3.5 py-2 text-sm font-medium text-slate-300 transition hover:bg-bg-elevated hover:text-white sm:block"
            >
              {t("marketing.security")}
            </Link>
            <Link
              href="/pricing"
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-300 transition hover:bg-bg-elevated hover:text-white"
            >
              {t("marketing.pricing")}
            </Link>
            <LanguageSwitcher compact />
            <Link href="/dashboard" className={buttonClasses("primary", "md")}>
              {t("marketing.openDashboard")}
            </Link>
          </div>
        </div>
      </header>

      <Hero />

      {/* ── Outcomes first ───────────────────────────────────────────────── */}
      <OutcomesBand />

      {/* Who it's for, in their words — outcomes before machinery */}
      <PersonaBand />

      {/* ── Proof ────────────────────────────────────────────────────────── */}
      <TrustStrip />
      <MoatBand />

      {/* ── Platform ─────────────────────────────────────────────────────── */}
      <EcosystemSection />

      {/* Always-on — paired with the live operations-stream visual */}
      <ActivitySection />

      {/* ── How it works (autonomous protection) ─────────────────────────── */}
      <AgentsSection />

      {/* ── Enterprise & architecture (deepest — for the few who want it) ── */}
      <EnterpriseSection />

      <SecurityArchitecture />

      {/* Capability modules */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-fg">
            Capabilities
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Everything it takes to defend your digital life.
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map((m) => (
            <div
              key={m.title}
              className="group relative overflow-hidden rounded-2xl border border-border bg-bg-elevated/50 p-5 transition duration-300 hover:-translate-y-1 hover:border-brand/40 hover:bg-bg-elevated/80 hover:shadow-2xl hover:shadow-brand/10"
            >
              <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-brand/15 opacity-0 blur-2xl transition duration-300 group-hover:opacity-100" />
              <span className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand ring-1 ring-brand/20 transition group-hover:bg-brand/20 group-hover:ring-brand/40">
                <m.icon className="h-5 w-5" />
              </span>
              <h3 className="relative mt-4 font-semibold text-white">{m.title}</h3>
              <p className="relative mt-1 text-sm leading-relaxed text-slate-400">{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-5xl px-6 py-24">
        <div className="relative overflow-hidden rounded-[2rem] border border-brand/25 bg-gradient-to-b from-brand/10 via-bg-elevated/40 to-bg-elevated/20 px-6 py-16 text-center shadow-2xl shadow-brand/10 ring-1 ring-white/5">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-28 h-56 bg-[radial-gradient(50%_100%_at_50%_0%,rgba(99,102,241,0.28),transparent_70%)]" />
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(40%_60%_at_80%_120%,rgba(165,180,252,0.15),transparent_70%)]" />
          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Take control of your digital footprint.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-slate-300">
              See what&apos;s exposed, remove it, and let autonomous agents defend you around the clock.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/scan" className={buttonClasses("primary", "lg")}>
                Run a Free Exposure Scan
              </Link>
              <Link href="/pricing" className={buttonClasses("secondary", "lg")}>
                View Pricing
              </Link>
            </div>
            <p className="mt-4 text-xs text-slate-500">Free · no signup · see what&apos;s exposed in seconds.</p>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-bg-subtle/30">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:grid-cols-5">
            <div className="col-span-2 lg:col-span-1">
              <BrandMark size={26} wordmarkClass="text-base" href={null} />
              <p className="mt-3 max-w-xs text-sm text-slate-400">
                The Digital Risk Operating System — autonomous privacy, reputation, identity and enterprise protection.
              </p>
            </div>
            {[
              { h: "Platform", links: [["Command Center", "/dashboard"], ["AI Agents", "/dashboard/agents"], ["Response Playbooks", "/dashboard/playbooks"], ["Pricing", "/pricing"]] },
              { h: "Suites", links: [["ReputationOS", "/dashboard/reputation"], ["ExecutiveOS", "/dashboard/executive"], ["BusinessOS", "/dashboard/business"], ["Growth & Revenue", "/dashboard/business-intelligence"]] },
              { h: "Trust", links: [["Security", "/security"], ["Compliance & SLAs", "/dashboard/compliance"], ["Audit Log", "/dashboard/audit"]] },
              { h: "Get started", links: [["Get Protected", "/dashboard/assistant"], ["Open Dashboard", "/dashboard"], ["Sign in", "/login"]] },
            ].map((col) => (
              <div key={col.h}>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{col.h}</p>
                <ul className="mt-3 space-y-2">
                  {col.links.map(([label, href]) => (
                    <li key={href}>
                      <Link href={href} className="text-sm text-slate-400 transition hover:text-white">{label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 sm:flex-row">
            <p className="text-xs text-slate-500">© {new Date().getFullYear()} PrivacyOS · Privacy, Reputation, Identity &amp; Digital Risk Management.</p>
            <p className="text-xs text-slate-500">GDPR · CCPA · SOC 2 · ISO 27001</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
