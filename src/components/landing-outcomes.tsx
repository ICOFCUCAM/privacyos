import Link from "next/link";
import {
  ScanLine, Database, AlertTriangle, Eye, Fingerprint, Star, Users, Banknote,
  ArrowRight, ShieldCheck, Trash2, Radar, CheckCircle2, Gauge, Crown, Building2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { buttonClasses } from "@/components/ui";
import { cn } from "@/lib/ui";

/* ── 2. Free Exposure Assessment — the primary conversion engine ──────────── */

const assessmentSteps: { label: string }[] = [
  { label: "Your protection score" },
  { label: "Every exposure we find" },
  { label: "Up to 10 free removals" },
  { label: "What's still at risk" },
];

export function FreeAssessmentBand() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <div className="relative overflow-hidden rounded-[2rem] border border-brand/25 bg-gradient-to-b from-brand/10 via-bg-elevated/40 to-bg-elevated/20 p-8 text-center shadow-2xl shadow-brand/10 ring-1 ring-white/5 sm:p-12">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-28 h-56 bg-[radial-gradient(50%_100%_at_50%_0%,rgba(99,102,241,0.28),transparent_70%)]" />
        <div className="relative">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/15 text-brand ring-1 ring-brand/30">
            <ScanLine className="h-7 w-7" />
          </span>
          <h2 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            See exactly what&rsquo;s exposed about you.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-300">
            Run a free exposure assessment. In under a minute you&rsquo;ll see your protection score,
            every place your data is exposed, and what we&rsquo;ll remove for you — free. No signup, no card.
          </p>
          <div className="mx-auto mt-7 grid max-w-2xl grid-cols-2 gap-2.5 sm:grid-cols-4">
            {assessmentSteps.map((s) => (
              <div key={s.label} className="flex items-center gap-2 rounded-xl border border-border bg-bg-subtle/50 px-3 py-2.5 text-left text-xs font-medium text-slate-300">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-risk-low" /> {s.label}
              </div>
            ))}
          </div>
          <Link href="/scan" className={cn(buttonClasses("primary", "lg"), "mt-8")}>
            <ScanLine className="h-4 w-4" /> Run my free exposure scan
          </Link>
          <p className="mt-3 text-xs text-slate-500">Free · no signup · results in under a minute.</p>
        </div>
      </div>
    </section>
  );
}

/* ── 3. Exposure categories discovered ───────────────────────────────────── */

const exposureCats: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: Database, title: "Data brokers selling your info", desc: "We find your listings on people-search sites and file removals to take them down." },
  { icon: AlertTriangle, title: "Accounts caught in breaches", desc: "We check your email against breach databases and help you lock down what's exposed." },
  { icon: Eye, title: "Dark-web exposure", desc: "We watch leak markets and paste sites for your credentials and alert you the moment they surface." },
  { icon: Fingerprint, title: "Identity & personal records", desc: "Home address, phone, family details — suppressed and removed before they're used against you." },
  { icon: Star, title: "Search & reputation", desc: "What shows up when people search your name — monitored, with negatives pushed down." },
  { icon: Users, title: "Family exposure", desc: "One shield for everyone at home — relatives opted out, kids' information kept offline." },
  { icon: Banknote, title: "Financial exposure", desc: "Exposed financial and payment data flagged so you can freeze, lock and protect it." },
  { icon: ShieldCheck, title: "Impersonation & deepfakes", desc: "Fake profiles and synthetic media of you, found and taken down." },
];

export function ExposureCategories() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-fg">
          What we find &amp; remove
        </span>
        <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Everywhere your information is exposed.
        </h2>
        <p className="mt-4 text-lg text-slate-400">
          We scan the places that put you at risk — and we don&rsquo;t just show you, we remove it and keep watching.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {exposureCats.map((c) => (
          <div key={c.title} className="group relative overflow-hidden rounded-2xl border border-border bg-bg-elevated/50 p-5 transition duration-300 hover:-translate-y-1 hover:border-brand/40 hover:bg-bg-elevated/80 hover:shadow-2xl hover:shadow-brand/10">
            <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-brand/15 opacity-0 blur-2xl transition duration-300 group-hover:opacity-100" />
            <span className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand ring-1 ring-brand/20 transition group-hover:bg-brand/20 group-hover:ring-brand/40">
              <c.icon className="h-5 w-5" />
            </span>
            <h3 className="relative mt-4 font-semibold text-white">{c.title}</h3>
            <p className="relative mt-1 text-sm leading-relaxed text-slate-400">{c.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── 4. How protection works (autonomous, on your behalf) ─────────────────── */

const steps: { icon: LucideIcon; step: string; title: string; desc: string }[] = [
  { icon: ScanLine, step: "01", title: "Run your free scan", desc: "See your protection score and every exposure across brokers, breaches, the dark web and search — in under a minute." },
  { icon: Trash2, step: "02", title: "We remove what's exposed", desc: "Broker opt-outs, takedowns and breach response — filed and tracked for you. You approve the big calls; we handle the rest." },
  { icon: Radar, step: "03", title: "We watch 24/7", desc: "Continuous monitoring across every layer. The moment something new surfaces, we act — and log it so you can sleep easy." },
];

export function HowProtectionWorks() {
  return (
    <section className="border-y border-border bg-bg-subtle/30">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-fg">
            How it works
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Protection that runs on your behalf.
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            You don&rsquo;t operate software. You tell us who to protect — and we discover, remove and defend automatically.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.step} className="relative rounded-2xl border border-border bg-bg-elevated/50 p-6">
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand ring-1 ring-brand/20">
                  <s.icon className="h-5 w-5" />
                </span>
                <span className="text-3xl font-black text-border">{s.step}</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-white">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── 5. Protection plans teaser ──────────────────────────────────────────── */

const planTiers: { icon: LucideIcon; name: string; who: string; from: string }[] = [
  { icon: ShieldCheck, name: "Personal", who: "Find, remove & monitor your data", from: "$14.99/mo" },
  { icon: Users, name: "Family", who: "One shield for everyone at home", from: "$99/mo" },
  { icon: Star, name: "Reputation", who: "Own your name across search & news", from: "$149/mo" },
  { icon: Crown, name: "Executive", who: "VIP-grade protection for you & family", from: "$999/mo" },
  { icon: Building2, name: "Business", who: "Protect your people, brand & domains", from: "$999/mo" },
];

export function ProtectionPlansTeaser() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-fg">
          Protection plans
        </span>
        <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Protection for everyone, at every scale.
        </h2>
        <p className="mt-4 text-lg text-slate-400">
          Start free. Upgrade to continuous, automatic protection whenever you&rsquo;re ready.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {planTiers.map((p) => (
          <Link key={p.name} href="/pricing" className="group flex flex-col rounded-2xl border border-border bg-bg-elevated/50 p-5 transition hover:-translate-y-1 hover:border-brand/40 hover:bg-bg-elevated/80">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand ring-1 ring-brand/20">
              <p.icon className="h-5 w-5" />
            </span>
            <h3 className="mt-3 font-semibold text-white">{p.name}</h3>
            <p className="mt-1 flex-1 text-xs leading-relaxed text-slate-400">{p.who}</p>
            <p className="mt-3 text-sm font-semibold text-brand-fg">from {p.from}</p>
          </Link>
        ))}
      </div>
      <div className="mt-8 text-center">
        <Link href="/pricing" className={buttonClasses("secondary", "lg")}>
          Compare all plans <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

/* ── Outcome metrics (re-framed from platform internals to customer outcomes) ── */
const outcomeMetrics: { icon: LucideIcon; value: string; label: string }[] = [
  { icon: Radar, value: "60+", label: "Sources scanned for you" },
  { icon: Gauge, value: "24/7", label: "Continuous monitoring" },
  { icon: Trash2, value: "Automatic", label: "Removals filed for you" },
  { icon: ShieldCheck, value: "Minutes", label: "To full protection" },
];

export function OutcomeMetricsBand() {
  return (
    <section className="border-y border-border">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px px-6 py-10 sm:grid-cols-4">
        {outcomeMetrics.map((o) => (
          <div key={o.label} className="px-4 text-center">
            <o.icon className="mx-auto mb-2 h-5 w-5 text-brand-fg" />
            <p className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{o.value}</p>
            <p className="mt-1 text-sm text-slate-400">{o.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
