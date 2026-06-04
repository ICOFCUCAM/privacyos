import Link from "next/link";
import {
  BadgeCheck, Lock, Server, KeyRound, ShieldCheck,
  Search, Trash2, Star, ShieldAlert, ScanFace, Crown, Scale, Building2,
  Radar, Eye, Sparkles, ArrowRight, Network, Zap, Boxes, Users, Landmark,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { buttonClasses } from "@/components/ui";
import { ExposureIntelligenceGraphic } from "@/components/landing-visuals";
import { AGENT_CATALOG } from "@/lib/data/mappers";
import type { AgentKind } from "@/lib/types";
import { cn } from "@/lib/ui";

/* ── Trust & compliance strip ────────────────────────────────────────────── */
const trustItems: { icon: LucideIcon; label: string }[] = [
  { icon: BadgeCheck, label: "GDPR Ready" },
  { icon: BadgeCheck, label: "CCPA Ready" },
  { icon: Server, label: "Enterprise Security" },
  { icon: ShieldCheck, label: "Privacy-First Architecture" },
  { icon: Lock, label: "End-to-End Encryption" },
  { icon: KeyRound, label: "Role-Based Access Control" },
];

export function TrustStrip() {
  return (
    <section className="border-y border-border bg-bg-subtle/20">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-7 gap-y-3 px-6 py-7">
        {trustItems.map((t) => (
          <span key={t.label} className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-400">
            <t.icon className="h-4 w-4 text-brand-fg" />
            {t.label}
          </span>
        ))}
      </div>
    </section>
  );
}

/* ── Autonomous AI agents ────────────────────────────────────────────────── */
const agentIcon: Record<AgentKind, LucideIcon> = {
  discovery: Search,
  privacy: Trash2,
  reputation: Star,
  security: ShieldAlert,
  deepfake: ScanFace,
  executive: Crown,
  legal: Scale,
  business: Building2,
  orchestrator: Network,
  incident: Zap,
  compliance: BadgeCheck,
  threat_intel: Radar,
  vendor: Boxes,
};

export function AgentsSection() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <span className="text-xs font-semibold uppercase tracking-wider text-brand-fg">Autonomous Protection</span>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          It finds it, removes it, and defends you — automatically.
        </h2>
        <p className="mt-4 text-lg text-slate-400">
          PrivacyOS continuously discovers risks, removes your exposures, protects your reputation
          and watches your footprint around the clock. You see outcomes, not the machinery.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {AGENT_CATALOG.map((a) => {
          const Icon = agentIcon[a.kind];
          return (
            <div key={a.kind} className="rounded-xl border border-border bg-bg-elevated/60 p-5 transition hover:border-brand/40">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/15">
                <Icon className="h-4 w-4 text-brand-fg" />
              </span>
              <h3 className="mt-3 font-semibold text-white">{a.name}</h3>
              <p className="mt-1 text-sm text-slate-400">{a.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ── Live intelligence activity ──────────────────────────────────────────── */
type Sev = "info" | "low" | "medium" | "high" | "critical";
const sevDot: Record<Sev, string> = {
  info: "bg-slate-500", low: "bg-risk-low", medium: "bg-risk-medium", high: "bg-risk-high", critical: "bg-risk-critical",
};
const activity: { icon: LucideIcon; title: string; src: string; sev: Sev; ago: string }[] = [
  { icon: Radar, title: "New exposure discovered", src: "Discovery Agent", sev: "high", ago: "just now" },
  { icon: Eye, title: "Credential leak detected on dark web", src: "Security Agent", sev: "critical", ago: "2m ago" },
  { icon: Trash2, title: "Data-broker removal request submitted", src: "Privacy Agent", sev: "low", ago: "11m ago" },
  { icon: Star, title: "Reputation risk identified in news", src: "Reputation Agent", sev: "medium", ago: "18m ago" },
  { icon: ShieldAlert, title: "Threat escalated for review", src: "Threat Agent", sev: "high", ago: "26m ago" },
  { icon: Sparkles, title: "AI recommendation generated", src: "Legal Agent", sev: "info", ago: "33m ago" },
];

export function ActivitySection() {
  return (
    <section className="border-y border-border bg-bg-subtle/30">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-6 py-24 lg:grid-cols-2">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-fg">Always On</span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Intelligence that never sleeps.
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            A new exposure, a leaked credential, a reputation hit — PrivacyOS detects it,
            prioritizes it, and acts. Continuous defense, running in the background.
          </p>
          <Link href="/dashboard" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-fg hover:underline">
            See the live Command Center <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="rounded-2xl border border-border bg-bg-elevated/70 p-5 backdrop-blur">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Operations stream</p>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-risk-low">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-risk-low opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-risk-low" />
              </span>
              LIVE
            </span>
          </div>
          <ul className="space-y-3">
            {activity.map((e, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", sevDot[e.sev])} />
                <e.icon className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="min-w-0 flex-1 truncate text-sm text-slate-200">{e.title}</span>
                <span className="hidden shrink-0 text-xs text-slate-500 sm:inline">{e.src}</span>
                <span className="shrink-0 text-xs text-slate-600">{e.ago}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ── Outcomes band (honest platform capability metrics) ──────────────────── */
const outcomes: { value: string; label: string }[] = [
  { value: "8", label: "Autonomous agents" },
  { value: "24/7", label: "Continuous monitoring" },
  { value: "5", label: "Integrated OS suites" },
  { value: "~90%", label: "Handled autonomously" },
];

export function OutcomesBand() {
  return (
    <section className="border-y border-border">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden px-6 py-10 sm:grid-cols-4">
        {outcomes.map((o) => (
          <div key={o.label} className="px-4 text-center">
            <p className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{o.value}</p>
            <p className="mt-1 text-sm text-slate-400">{o.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Platform ecosystem (the OS suites) ──────────────────────────────────── */
const suites: { icon: LucideIcon; name: string; desc: string }[] = [
  { icon: ShieldCheck, name: "PrivacyOS", desc: "Exposure discovery, broker removals, dark-web & identity protection." },
  { icon: Star, name: "ReputationOS", desc: "Search, brand & news monitoring with sentiment and recovery." },
  { icon: Crown, name: "ExecutiveOS", desc: "Doxxing, deepfake, impersonation, family & travel-risk protection." },
  { icon: Building2, name: "BusinessOS", desc: "Employee, credential, domain & third-party risk intelligence." },
  { icon: Scale, name: "LegalOS", desc: "Auto-drafted GDPR/CCPA requests, complaints & evidence packets." },
];

export function EcosystemSection() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
        {/* Visual first on the narrative beat */}
        <div className="order-2 flex justify-center lg:order-1">
          <ExposureIntelligenceGraphic />
        </div>
        <div className="order-1 lg:order-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-fg">One Platform</span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            A complete Digital Risk Operating System.
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            Five integrated suites — protecting individuals, executives, families and
            enterprises from one console.
          </p>
          <ul className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {suites.map((s) => (
              <li key={s.name} className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand/25 to-brand/5">
                  <s.icon className="h-4 w-4 text-brand-fg" />
                </span>
                <span className="text-sm font-semibold text-white">{s.name}</span>
              </li>
            ))}
          </ul>
          <Link href="/pricing" className={cn(buttonClasses("primary", "lg"), "mt-7")}>
            Explore plans <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ── Enterprise infrastructure positioning ───────────────────────────────── */

const enterpriseCapabilities: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: Crown, title: "Monitor executives", desc: "VIP doxxing, impersonation, deepfake and travel-risk protection at board level." },
  { icon: Building2, title: "Protect the workforce", desc: "Employee exposure, credential-leak and third-party risk across the whole org." },
  { icon: ScanFace, title: "Detect deepfakes & impersonation", desc: "Proprietary detection models with measured precision, recall and F1." },
  { icon: Scale, title: "Automate compliance & legal", desc: "GDPR/CCPA requests, broker opt-outs and an append-only audit trail, generated automatically." },
  { icon: Star, title: "Manage reputation", desc: "Search, brand, news and sentiment intelligence with recovery workflows." },
  { icon: Sparkles, title: "Run autonomous AI agents", desc: "A fleet of specialists that discover, remediate and escalate 24/7 — your automation moat." },
];


export function EnterpriseSection() {
  return (
    <section className="border-y border-border bg-bg-elevated/30">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-fg">Enterprise Infrastructure</span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Where companies make PrivacyOS critical infrastructure.
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            Recurring, sticky, hard to replace — organizations run their whole digital-risk
            operation here, from executive protection to compliance automation.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {enterpriseCapabilities.map((c) => (
            <div key={c.title} className="rounded-xl border border-border bg-bg-elevated/60 p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-brand/25 to-brand/5">
                <c.icon className="h-5 w-5 text-brand-fg" />
              </span>
              <h3 className="mt-3 font-semibold text-white">{c.title}</h3>
              <p className="mt-1 text-sm text-slate-400">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Who we protect — each card is a mini product: the live risk "signals" we
   watch for that audience, linking to the matching plan. ──────────────────── */
const protectedGroups: { icon: LucideIcon; who: string; risk: string; plan: string; signals: string[] }[] = [
  { icon: ShieldCheck, who: "Individuals", risk: "Your home address, phone, identity and accounts are being sold and leaked — found and taken down.", plan: "plus", signals: ["Identity theft", "Data brokers", "Dark web", "Account takeover"] },
  { icon: Users, who: "Families", risk: "Everyone under one roof — spouse, parents and children — protected from the same broker sites and leaks.", plan: "family", signals: ["Children's data", "Household exposure", "Relatives", "Location"] },
  { icon: Crown, who: "Executives", risk: "Leadership is targeted for doxxing, impersonation and home-address exposure — shielded at principal grade.", plan: "exec-essential", signals: ["Doxxing", "Impersonation", "Threat actors", "Residence"] },
  { icon: Star, who: "Public figures", risk: "Visibility invites harassment, fake profiles and deepfakes — monitored everywhere and removed.", plan: "rep-public-figure", signals: ["Fake profiles", "Deepfakes", "Reputation", "Harassment"] },
  { icon: Landmark, who: "Politicians & candidates", risk: "Office attracts coordinated doxxing, disinformation and threats to you and your family — defended in real time.", plan: "exec-pro", signals: ["Threat network", "Public exposure", "Disinformation", "Family risk"] },
  { icon: Building2, who: "Businesses", risk: "Your people, brand and domains are attack surface — protected across the whole organization.", plan: "biz-startup", signals: ["Employees", "Domains", "Vendors", "Brand abuse"] },
];

const SIGNAL_DOT = ["bg-risk-high", "bg-risk-medium", "bg-brand", "bg-risk-low"];

export function PersonaBand() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <span className="eyebrow">Who we protect</span>
        <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Built for everyone with something to lose.
        </h2>
        <p className="mt-4 text-lg text-slate-400">
          Whoever you are, your private information is already out there. Here&rsquo;s what we stand between you and harm.
        </p>
      </div>
      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {protectedGroups.map((p) => (
          <Link
            key={p.who}
            href={`/pricing?plan=${p.plan}`}
            className="premium-card group relative flex flex-col overflow-hidden p-6"
          >
            <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-brand/15 opacity-0 blur-2xl transition duration-300 group-hover:opacity-100" />
            <span className="icon-tile relative h-11 w-11">
              <p.icon className="h-5 w-5 text-brand-fg" />
            </span>
            <h3 className="relative mt-4 text-lg font-semibold text-white">{p.who}</h3>
            <p className="relative mt-2 text-sm leading-relaxed text-slate-400">{p.risk}</p>
            {/* live risk "signals" we watch for this audience — the product preview */}
            <div className="relative mt-4 flex-1">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Signals monitored</p>
              <div className="grid grid-cols-2 gap-1.5">
                {p.signals.map((s, i) => (
                  <span key={s} className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-bg-subtle/40 px-2 py-1.5 text-[11px] font-medium text-slate-300">
                    <span className={cn("live-ping h-1.5 w-1.5 shrink-0 rounded-full", SIGNAL_DOT[i % SIGNAL_DOT.length])} style={{ animationDelay: `${i * 0.4}s` }} />
                    <span className="truncate">{s}</span>
                  </span>
                ))}
              </div>
            </div>
            <span className="relative mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand-fg opacity-80 transition group-hover:opacity-100">
              See {p.who.toLowerCase()} plans <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
