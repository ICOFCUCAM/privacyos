import Link from "next/link";
import {
  Cpu, Fingerprint, ShieldCheck, Banknote, Users, Crown, VenetianMask, Crosshair,
  Star, Search, Share2, Newspaper, Building2, Globe, UserCog, Baby,
  Radar, Activity, FolderKanban, Trash2, FileLock2, Scale, ArrowRight, CheckCircle2,
  Landmark, Rocket, Mic, BellRing, Eye, Megaphone, CreditCard,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { buttonClasses } from "@/components/ui";

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-fg">
    {children}
  </span>
);

/* ── It takes a stack of vendors to do what PrivacyOS does in one ──────────────
   The category-creator story: every competitor owns one layer; PrivacyOS owns
   all of them — and connects them. Designed to land in the first 30 seconds. */

const pointTools: { category: string; examples: string; does: string; icon: LucideIcon }[] = [
  { category: "Data-broker removal", examples: "Opt-out subscriptions", does: "Files opt-outs with people-search sites", icon: Trash2 },
  { category: "Identity protection", examples: "Identity-theft services", does: "Identity-theft & account-takeover monitoring", icon: Fingerprint },
  { category: "Credit monitoring", examples: "Bureau-alert services", does: "Watches your credit file across the three bureaus", icon: CreditCard },
  { category: "Dark-web monitoring", examples: "Breach-alert tools", does: "Pings you when a credential leaks", icon: Eye },
  { category: "Reputation management", examples: "PR & SEO agencies", does: "Cleans search results by hand, per retainer", icon: Star },
  { category: "Executive protection", examples: "Risk & security firms", does: "Doxxing & physical-threat response", icon: Crown },
  { category: "Brand & social monitoring", examples: "Listening tools", does: "Tracks mentions across the web", icon: Megaphone },
];

export function OnePlatformReplacesStack() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <Eyebrow>A category, not a tool</Eyebrow>
        <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          It takes a stack of vendors to do what PrivacyOS does in one.
        </h2>
        <p className="mt-4 text-lg text-slate-400">
          Each of them owns a single slice — and none of them talk to each other. PrivacyOS is all
          of those layers, run by one intelligence engine that turns a finding into action.
        </p>
      </div>

      <div className="mt-12 grid items-start gap-5 lg:grid-cols-2">
        {/* The fragmented stack */}
        <div className="rounded-2xl border border-border bg-bg-elevated/30 p-6">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">The point-tool stack</p>
          <ul className="mt-4 space-y-2.5">
            {pointTools.map((t) => (
              <li key={t.category} className="flex items-start gap-3 rounded-xl border border-border/60 bg-bg-subtle/30 px-3.5 py-2.5">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-500/10 text-slate-500 ring-1 ring-slate-500/20">
                  <t.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-300">{t.category} <span className="text-xs font-normal text-slate-500">· {t.examples}</span></p>
                  <p className="text-xs text-slate-500">{t.does}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-slate-500">Six tools. Six bills. Six logins. Nothing connected.</p>
        </div>

        {/* PrivacyOS — one platform */}
        <div className="relative overflow-hidden rounded-2xl border border-brand/30 bg-gradient-to-b from-brand/10 to-transparent p-6 shadow-lg shadow-brand/10">
          <div aria-hidden className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-brand/20 blur-2xl" />
          <div className="relative flex items-center gap-2.5">
            <Cpu className="h-5 w-5 text-brand-fg" />
            <p className="text-[11px] font-bold uppercase tracking-wider text-brand-fg">PrivacyOS · one platform</p>
          </div>
          <ul className="relative mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {pointTools.map((t) => (
              <li key={t.category} className="flex items-center gap-2 rounded-lg border border-border/60 bg-bg-subtle/40 px-3 py-2 text-sm text-white">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-risk-low" /> {t.category}
              </li>
            ))}
          </ul>
          <div className="relative mt-5 rounded-xl border border-brand/25 bg-bg-subtle/40 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-brand-fg">And the part none of them do</p>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-200">
              One finding becomes a case → removal → sealed evidence → legal action → monitoring —
              automatically, with a tamper-evident record at every step.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── One Platform. Every Layer. ─────────────────────────────────────────────
   The category visual: five domains of digital risk, all run by one engine. */

const layers: { domain: string; icon: LucideIcon; items: { label: string; icon: LucideIcon }[] }[] = [
  { domain: "Personal", icon: Fingerprint, items: [
    { label: "Identity", icon: Fingerprint }, { label: "Privacy", icon: ShieldCheck }, { label: "Financial", icon: Banknote },
  ] },
  { domain: "Family", icon: Users, items: [
    { label: "Children", icon: Baby }, { label: "Household", icon: Users }, { label: "Relatives", icon: Users },
  ] },
  { domain: "Executive", icon: Crown, items: [
    { label: "Doxxing", icon: Crosshair }, { label: "Impersonation", icon: VenetianMask }, { label: "Threat actors", icon: Crosshair },
  ] },
  { domain: "Reputation", icon: Star, items: [
    { label: "Search", icon: Search }, { label: "Social", icon: Share2 }, { label: "Media", icon: Newspaper },
  ] },
  { domain: "Business", icon: Building2, items: [
    { label: "Employees", icon: UserCog }, { label: "Domains", icon: Globe }, { label: "Vendors", icon: Building2 },
  ] },
];

export function PlatformLayers() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <Eyebrow>One platform. Every layer.</Eyebrow>
        <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Every layer of digital risk — run by one engine.
        </h2>
        <p className="mt-4 text-lg text-slate-400">
          Not five tools that happen to share a login. One subject, one timeline, one intelligence
          engine — so a finding in any layer cascades across all of them.
        </p>
      </div>

      {/* The engine, then the five domains feeding it */}
      <div className="mt-12 flex flex-col items-center">
        <div className="inline-flex items-center gap-2.5 rounded-2xl border border-brand/40 bg-gradient-to-b from-brand/20 to-brand/5 px-5 py-3 shadow-lg shadow-brand/10">
          <Cpu className="h-5 w-5 text-brand-fg" />
          <span className="text-sm font-bold tracking-wide text-white">PrivacyOS Intelligence Engine</span>
        </div>
        <div aria-hidden className="h-8 w-px bg-gradient-to-b from-brand/50 to-transparent" />

        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {layers.map((l) => (
            <div key={l.domain} className="rounded-2xl border border-border bg-bg-elevated/50 p-5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand/25 to-brand/5 ring-1 ring-brand/20">
                  <l.icon className="h-4 w-4 text-brand-fg" />
                </span>
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-300">{l.domain}</h3>
              </div>
              <ul className="mt-4 space-y-2">
                {l.items.map((it) => (
                  <li key={it.label} className="flex items-center gap-2 rounded-lg border border-border/60 bg-bg-subtle/40 px-2.5 py-1.5 text-sm text-slate-200">
                    <it.icon className="h-3.5 w-3.5 shrink-0 text-brand-fg" /> {it.label}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Built For People Who Cannot Afford Exposure ──────────────────────────── */

const highStakes: { role: string; icon: LucideIcon; plan: string }[] = [
  { role: "Politicians", icon: Landmark, plan: "exec-pro" },
  { role: "Public officials", icon: Scale, plan: "exec-essential" },
  { role: "Executives", icon: Crown, plan: "exec-essential" },
  { role: "Founders", icon: Rocket, plan: "biz-startup" },
  { role: "Journalists", icon: Mic, plan: "rep-public-figure" },
  { role: "Public figures", icon: Star, plan: "rep-public-figure" },
];

export function HighStakesBuyers() {
  return (
    <section className="relative overflow-hidden border-y border-border bg-bg-subtle/30 py-24">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-24 h-48 bg-[radial-gradient(50%_100%_at_50%_0%,rgba(99,102,241,0.18),transparent_70%)]" />
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>High-stakes protection</Eyebrow>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Built for people who cannot afford exposure.
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            PrivacyOS continuously identifies and reduces public exposure across people-search
            databases, breach datasets, social networks, search engines and threat-intelligence
            sources — before it is used against you.
          </p>
        </div>
        <div className="mx-auto mt-12 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-3">
          {highStakes.map((h) => (
            <Link key={h.role} href={`/pricing?plan=${h.plan}`} className="group flex items-center gap-3 rounded-xl border border-border bg-bg-elevated/60 px-4 py-3.5 transition hover:border-brand/40 hover:bg-bg-elevated/80">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand/25 to-brand/5 ring-1 ring-brand/20">
                <h.icon className="h-4 w-4 text-brand-fg" />
              </span>
              <span className="flex-1 text-sm font-semibold text-white">{h.role}</span>
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-brand-fg" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Detection Is Not Protection ──────────────────────────────────────────── */

const protectionVerbs = ["Discover", "Investigate", "Remove", "Document", "Escalate", "Monitor", "Report"];

export function DetectionIsNotProtection() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <Eyebrow>Detection is not protection</Eyebrow>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Most platforms alert you. Then it is your problem.
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            Monitoring tells you that you are exposed. PrivacyOS does something about it —
            autonomously, end to end, and logs every step as evidence.
          </p>
          <div className="mt-6 rounded-xl border border-border bg-bg-elevated/50 px-4 py-3 text-sm text-slate-400">
            Most platforms stop at the alert. We run the whole response.
          </div>
        </div>
        <div className="rounded-2xl border border-brand/25 bg-gradient-to-b from-brand/10 to-transparent p-6">
          <p className="text-[11px] font-bold uppercase tracking-wider text-brand-fg">PrivacyOS can</p>
          <ul className="mt-4 space-y-2.5">
            {protectionVerbs.map((v) => (
              <li key={v} className="flex items-center gap-3 rounded-lg border border-border/60 bg-bg-subtle/40 px-3.5 py-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-risk-low" />
                <span className="text-base font-semibold text-white">{v}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ── What Happens When A Threat Is Found? ─────────────────────────────────────
   The cascade, which the engine actually runs — finding to monitoring. */

const flowSteps: { step: string; icon: LucideIcon; note: string }[] = [
  { step: "Exposure found", icon: Radar, note: "Discovery sweeps brokers, breaches, dark web, search & social" },
  { step: "Risk analysis", icon: Activity, note: "Scored, correlated and prioritized by the engine" },
  { step: "Case created", icon: FolderKanban, note: "A tracked case opens and the responding agent is assigned" },
  { step: "Broker removal", icon: Trash2, note: "Opt-outs filed and chased, with 30/60/90-day re-checks" },
  { step: "Evidence archived", icon: FileLock2, note: "Sealed with a SHA-256 digest and a full chain of custody" },
  { step: "Legal workflow", icon: Scale, note: "The matching erasure / takedown instrument is drafted" },
  { step: "Continuous monitoring", icon: BellRing, note: "It keeps watching — and acts again the moment it resurfaces" },
];

export function ThreatResponseFlow() {
  return (
    <section className="relative overflow-hidden border-y border-border bg-bg-subtle/30 py-24">
      <div className="relative mx-auto max-w-5xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>One workflow, not seven tools</Eyebrow>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            What happens when a threat is found?
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            Every detection runs the same end-to-end response — automatically, with a tamper-evident
            record at every step. This is the platform, in one picture.
          </p>
        </div>

        <ol className="mx-auto mt-12 max-w-2xl">
          {flowSteps.map((s, i) => (
            <li key={s.step} className="relative pl-16">
              {i < flowSteps.length - 1 && (
                <span aria-hidden className="absolute left-[1.85rem] top-12 h-[calc(100%-1.5rem)] w-px bg-gradient-to-b from-brand/40 to-brand/10" />
              )}
              <div className="flex items-start gap-4 pb-7">
                <span className="absolute left-0 flex h-[3.75rem] w-[3.75rem] shrink-0 items-center justify-center rounded-2xl border border-brand/30 bg-gradient-to-br from-brand/20 to-brand/5 shadow-lg shadow-brand/10">
                  <s.icon className="h-6 w-6 text-brand-fg" />
                </span>
                <div className="min-w-0 pt-1.5">
                  <p className="text-base font-semibold text-white">{s.step}</p>
                  <p className="mt-0.5 text-sm text-slate-400">{s.note}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-2 flex justify-center">
          <Link href="/scan" className={buttonClasses("primary", "lg")}>
            <Radar className="h-4 w-4" /> See what is exposed about you
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
