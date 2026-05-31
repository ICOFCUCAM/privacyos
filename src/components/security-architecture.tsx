import { Database, KeyRound, ScrollText, Lock, ShieldCheck, RadioTower } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const pillars: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: Database,
    title: "Multi-tenant isolation",
    desc: "Row-level security on every table — each tenant can only ever read its own data, enforced by the database, not just the app.",
  },
  {
    icon: KeyRound,
    title: "Role-based access control",
    desc: "Owner, admin, member and viewer roles govern every org action, enforced in both the UI and the database layer.",
  },
  {
    icon: ScrollText,
    title: "Append-only audit log",
    desc: "Every protection action — removals, approvals, role changes — is recorded for accountability and compliance review.",
  },
  {
    icon: Lock,
    title: "Encrypted in transit & at rest",
    desc: "TLS everywhere and encryption at rest. Secrets live server-side only and are never exposed to the browser.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy-first architecture",
    desc: "Data minimization by design — we store only what's needed to protect you, and provide erasure workflows on request.",
  },
  {
    icon: RadioTower,
    title: "Signed, isolated automation",
    desc: "Webhooks are signature-verified, scheduled jobs run behind a secret with service-role isolation, and failures degrade safely.",
  },
];

export function SecurityArchitecture({ heading = true }: { heading?: boolean }) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      {heading && (
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-fg">Security Architecture</span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Built like the platforms you already trust.
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            PrivacyOS protects sensitive data with the controls enterprise security teams expect —
            isolation, access control, auditability and encryption at every layer.
          </p>
        </div>
      )}

      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pillars.map((p) => (
          <div key={p.title} className="rounded-xl border border-border bg-bg-elevated/60 p-6 transition hover:border-brand/40">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/15">
              <p.icon className="h-5 w-5 text-brand-fg" />
            </span>
            <h3 className="mt-4 font-semibold text-white">{p.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{p.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
