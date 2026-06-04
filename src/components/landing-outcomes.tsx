import Link from "next/link";
import {
  ScanLine, Database, AlertTriangle, Eye, Fingerprint, Star, Users, Banknote,
  ArrowRight, ShieldCheck, Trash2, Radar, CheckCircle2, Gauge, Crown, Building2,
  MapPinned, Megaphone, ScanFace, ShieldAlert, Siren, UserCheck, Activity,
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
          <span className="icon-tile mx-auto h-14 w-14">
            <ScanLine className="h-7 w-7 text-brand-fg" />
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

/* ── 4. What PrivacyOS does automatically (the protection lifecycle) ───────── */

const lifecycle: { icon: LucideIcon; step: string; title: string; desc: string }[] = [
  { icon: ScanLine, step: "Discover", title: "We find what's exposed", desc: "Across data brokers, breaches, the dark web, search and social — we map everything that's out there about you." },
  { icon: Trash2, step: "Remove", title: "We take it down", desc: "Broker opt-outs, takedown requests and breach response — filed and chased on your behalf until they're gone." },
  { icon: ShieldCheck, step: "Protect", title: "We lock you down", desc: "We harden your identity, accounts and family footprint so the same information can't resurface against you." },
  { icon: Radar, step: "Monitor", title: "We watch 24/7", desc: "Continuous monitoring across every layer. The moment something new surfaces, we already know about it." },
  { icon: Gauge, step: "Respond", title: "We act on threats", desc: "New exposure, impersonation or leak? We respond automatically and log every action — so you can sleep easy." },
];

export function HowProtectionWorks() {
  return (
    <section className="border-y border-border bg-bg-subtle/30">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-fg">
            What we do automatically
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            You don&rsquo;t operate software. We do the work.
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            Tell us who to protect. From there, PrivacyOS runs a continuous protection cycle on your behalf — every day, automatically.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {lifecycle.map((s, i) => (
            <div key={s.step} className="relative rounded-2xl border border-border bg-bg-elevated/50 p-5">
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand ring-1 ring-brand/20">
                  <s.icon className="h-5 w-5" />
                </span>
                <span className="text-2xl font-black text-border">{i + 1}</span>
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-brand-fg">{s.step}</p>
              <h3 className="mt-1 font-semibold text-white">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── 5. Public figures & political protection (premium) ───────────────────── */

const figureThreats: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: MapPinned, title: "Doxxing & home exposure", desc: "Your residence, family and routine scrubbed from broker sites and forums before they're weaponized." },
  { icon: Megaphone, title: "Reputation & disinformation", desc: "Coordinated narratives and smears tracked across search, news and social — and countered fast." },
  { icon: Users, title: "Family protection", desc: "Spouses, parents and children shielded from the targeting that follows your public profile." },
  { icon: ScanFace, title: "Deepfakes & synthetic media", desc: "Fabricated video, audio and images of you detected and taken down before they spread." },
  { icon: ShieldAlert, title: "Impersonation", desc: "Fake accounts and lookalike profiles posing as you, found and removed across platforms." },
  { icon: Siren, title: "Threat response", desc: "Credible threats escalated and acted on in real time — with a documented evidence trail." },
];

export function PublicFigureProtection() {
  return (
    <section className="relative overflow-hidden border-y border-border bg-gradient-to-b from-bg-elevated/40 via-bg to-bg">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-32 h-64 bg-[radial-gradient(50%_100%_at_50%_0%,rgba(99,102,241,0.18),transparent_70%)]" />
      <div className="relative mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="eyebrow">
            <Crown className="h-3.5 w-3.5" /> Public figures &amp; political protection
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            When you&rsquo;re a target, protection can&rsquo;t wait.
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            Politicians, candidates, government officials, public figures and executives face
            threats most people never will. PrivacyOS delivers dedicated, around-the-clock defense
            for you and your family.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {figureThreats.map((c) => (
            <div key={c.title} className="premium-card p-5">
              <span className="icon-tile h-11 w-11">
                <c.icon className="h-5 w-5 text-brand-fg" />
              </span>
              <h3 className="mt-4 font-semibold text-white">{c.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{c.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link href="/pricing" className={buttonClasses("primary", "lg")}>
            Explore executive &amp; VIP protection <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ── 7. Why PrivacyOS is different (we act, not just report) ───────────────── */

const differentiators: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: ScanLine, title: "We discover", desc: "We don't wait for you to find a problem. We continuously map your exposure everywhere it lives." },
  { icon: Trash2, title: "We remove", desc: "Most services hand you a list and wish you luck. We file the removals and chase them down for you." },
  { icon: Radar, title: "We monitor", desc: "Protection isn't a one-time report. We keep watching, every day, so nothing creeps back." },
  { icon: ShieldCheck, title: "We protect", desc: "We harden your identity, accounts and family so the same exposures can't be used against you." },
  { icon: Gauge, title: "We respond", desc: "When a threat appears, we act on it automatically — and show you exactly what we did." },
];

export function WhyDifferent() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-fg">
          Why PrivacyOS is different
        </span>
        <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Most services stop at reporting. PrivacyOS acts.
        </h2>
        <p className="mt-4 text-lg text-slate-400">
          Anyone can tell you you&rsquo;re exposed. We do something about it — and keep doing it,
          so protection is something that happens to you, not another task on your list.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {differentiators.map((d) => (
          <div key={d.title} className="rounded-2xl border border-border bg-bg-elevated/50 p-5">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand ring-1 ring-brand/20">
              <d.icon className="h-5 w-5" />
            </span>
            <h3 className="mt-4 font-semibold text-white">{d.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{d.desc}</p>
          </div>
        ))}
      </div>
      <p className="mx-auto mt-10 max-w-2xl text-center text-lg font-medium text-white">
        You get peace of mind. <span className="text-brand-fg">We do the work.</span>
      </p>
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
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

/* ── 6. Real outcomes (what protection delivers — trust, not engineering) ──── */
type Outcome = { icon: LucideIcon; value: string; label: string };
const realOutcomes: Outcome[] = [
  { icon: Trash2, value: "Exposures", label: "Found and removed on your behalf" },
  { icon: UserCheck, value: "Identities", label: "Protected from theft and misuse" },
  { icon: ShieldAlert, value: "Threats", label: "Prevented before they reach you" },
  { icon: Database, value: "Data brokers", label: "Opted out and kept out" },
  { icon: Users, value: "Families", label: "Shielded under one protection" },
  { icon: Activity, value: "24/7", label: "Continuous monitoring & response" },
];

export function OutcomeMetricsBand() {
  return (
    <section className="border-y border-border bg-bg-subtle/20">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="eyebrow">Real outcomes</span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Protection you can feel, not just a report.
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            Every day, PrivacyOS turns exposure into safety — quietly working in the background so you don&rsquo;t have to.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {realOutcomes.map((o) => (
            <div key={o.label} className="premium-card p-6 text-center">
              <span className="icon-tile mx-auto mb-3 h-11 w-11">
                <o.icon className="h-5 w-5 text-brand-fg" />
              </span>
              <p className="text-xl font-bold tracking-tight text-white sm:text-2xl">{o.value}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">{o.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
