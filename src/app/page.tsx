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
  ArrowRight,
} from "lucide-react";

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
    <main className="bg-grid min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-brand" />
          <span className="text-lg font-bold text-white">PrivacyOS</span>
        </div>
        <Link
          href="/dashboard"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand/90"
        >
          Open Dashboard
        </Link>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-elevated px-3 py-1 text-xs font-medium text-brand-fg">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
          The operating system for digital privacy
        </span>
        <h1 className="mt-6 text-5xl font-bold leading-tight tracking-tight text-white sm:text-6xl">
          The antivirus for your
          <span className="bg-gradient-to-r from-brand-fg to-brand bg-clip-text text-transparent">
            {" "}
            personal information
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
          PrivacyOS discovers, monitors, analyzes, and continuously defends your
          digital presence across search engines, data brokers, social media,
          the dark web, and AI-generated content — powered by autonomous AI agents.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            href="/dashboard/assistant"
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand/90"
          >
            Protect me <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="https://code.claude.com/docs/en/claude-code-on-the-web"
            className="rounded-lg border border-border px-6 py-3 text-sm font-semibold text-slate-200 transition hover:bg-bg-elevated"
          >
            View architecture
          </a>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-28">
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

      <footer className="border-t border-border py-8 text-center text-sm text-slate-500">
        PrivacyOS — Privacy, Reputation, Identity & Digital Risk Management.
      </footer>
    </main>
  );
}
