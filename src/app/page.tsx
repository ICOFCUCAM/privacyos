import Link from "next/link";
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
} from "@/components/landing-sections";
import { SecurityArchitecture } from "@/components/security-architecture";
import { buttonClasses } from "@/components/ui";

const modules = [
  { icon: Search, title: "Privacy Discovery", desc: "Find every discoverable exposure across the public internet, brokers and breaches." },
  { icon: Shield, title: "Identity Protection", desc: "Continuous defense of names, emails, phones, addresses and credentials." },
  { icon: Eye, title: "Dark Web Monitoring", desc: "Real-time alerts on credential leaks and identity-theft indicators." },
  { icon: ScanFace, title: "Deepfake Detection", desc: "Detect AI-generated media, voice clones and synthetic impersonation." },
  { icon: Scale, title: "AI Legal Automation", desc: "Auto-draft GDPR/CCPA requests, complaints and takedown evidence." },
  { icon: Building2, title: "Business Intelligence", desc: "Employee credential leaks, exposed assets and brand impersonation." },
  { icon: Users, title: "Family & Executive", desc: "VIP-grade protection for executives, public figures and families." },
  { icon: Bot, title: "Autonomous Agents", desc: "Eight specialized agents that defend you 24/7. You see outcomes, not complexity." },
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

      <EcosystemSection />

      <AgentsSection />

      <ActivitySection />

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
            Discover what&apos;s exposed, remove it, and let autonomous agents defend you around the clock.
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

      <footer className="border-t border-border py-8 text-center text-sm text-slate-500">
        PrivacyOS — Privacy, Reputation, Identity &amp; Digital Risk Management.
      </footer>
    </main>
  );
}
