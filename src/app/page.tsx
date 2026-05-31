import Link from "next/link";
import Image from "next/image";
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
} from "@/components/landing-sections";
import { MoatBand } from "@/components/landing-visuals";
import { SecurityArchitecture } from "@/components/security-architecture";
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

export default function LandingPage() {
  return (
    <main id="content" className="bg-grid min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-brand" />
          <span className="text-lg font-bold text-white">PrivacyOS</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/security"
            className="hidden rounded-lg px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-bg-elevated sm:block"
          >
            Security
          </Link>
          <Link
            href="/pricing"
            className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-bg-elevated"
          >
            Pricing
          </Link>
          <Link href="/dashboard" className={buttonClasses("primary", "md")}>
            Open Dashboard
          </Link>
        </div>
      </header>

      <Hero />

      <TrustStrip />

      {/* The moat dominates: autonomous agents + Digital Risk OS, with a visual */}
      <MoatBand />

      <OutcomesBand />

      {/* Platform — paired with the exposure-intelligence visual */}
      <EcosystemSection />

      <AgentsSection />

      {/* Always-on — paired with the live operations-stream visual */}
      <ActivitySection />

      <EnterpriseSection />

      <SecurityArchitecture />

      {/* Capability modules */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-fg">Capabilities</span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Everything it takes to defend your digital life.
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map((m) => (
            <div
              key={m.title}
              className="rounded-xl border border-border bg-bg-elevated/60 p-5 transition hover:border-brand/40"
            >
              <m.icon className="h-6 w-6 text-brand" />
              <h3 className="mt-3 font-semibold text-white">{m.title}</h3>
              <p className="mt-1 text-sm text-slate-400">{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border bg-bg-subtle/30">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Take control of your digital footprint.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-400">
            See what&apos;s exposed, remove it, and let autonomous agents defend you around the clock.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link href="/dashboard/assistant" className={buttonClasses("primary", "lg")}>
              Get Protected
            </Link>
            <Link href="/pricing" className={buttonClasses("secondary", "lg")}>
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-bg-subtle/30">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:grid-cols-5">
            <div className="col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2">
                <Image src="/PrivacyLogo.png" alt="" width={24} height={24} className="h-6 w-6" />
                <span className="text-base font-bold text-white">PrivacyOS</span>
              </div>
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
