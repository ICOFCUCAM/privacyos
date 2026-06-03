import Link from "next/link";
import type { Metadata } from "next";
import { BadgeCheck, FileCheck2, Server } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { SecurityArchitecture } from "@/components/security-architecture";
import { buttonClasses } from "@/components/ui";

export const metadata: Metadata = {
  title: "Security & Compliance",
  description:
    "How PrivacyOS protects your data: multi-tenant isolation, RBAC, audit logging, encryption, and GDPR/CCPA-ready workflows.",
};

const compliance = [
  { icon: BadgeCheck, title: "GDPR Ready", desc: "Article 17 erasure request generation and tracking built into the platform." },
  { icon: BadgeCheck, title: "CCPA Ready", desc: "Right-to-delete workflows for California residents, end to end." },
  { icon: FileCheck2, title: "Auditability", desc: "An append-only audit log of every action, exportable for compliance review." },
  { icon: Server, title: "Data residency", desc: "Built on enterprise cloud infrastructure with encryption in transit and at rest." },
];

const practices = [
  "Row-level security isolates every tenant's data at the database layer.",
  "Role-based access control (owner / admin / member / viewer) on all org actions.",
  "Service-role credentials are server-only and never shipped to the client.",
  "Stripe webhooks are signature-verified before any state change.",
  "Scheduled automation runs behind a shared secret with isolated privileges.",
  "Data minimization — only the identifiers needed to protect you are stored.",
];

export default function SecurityPage() {
  return (
    <main className="bg-grid min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <BrandMark size={32} wordmarkClass="text-xl" />
        <div className="flex items-center gap-2">
          <Link href="/pricing" className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-bg-elevated">
            Pricing
          </Link>
          <Link href="/dashboard" className={buttonClasses("primary", "md")}>
            Open Dashboard
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 pb-6 pt-12 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-elevated/70 px-3 py-1 text-xs font-medium text-brand-fg">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          Security &amp; Compliance
        </span>
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Security is the product.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-400">
          PrivacyOS exists to reduce your digital risk — so the platform itself is built to the
          standards enterprise security and privacy teams demand.
        </p>
      </section>

      <SecurityArchitecture heading={false} />

      {/* Compliance */}
      <section className="border-y border-border bg-bg-subtle/30">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-center text-3xl font-bold tracking-tight text-white">Compliance &amp; data handling</h2>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {compliance.map((c) => (
              <div key={c.title} className="rounded-xl border border-border bg-bg-elevated/60 p-5">
                <c.icon className="h-6 w-6 text-brand-fg" />
                <h3 className="mt-3 font-semibold text-white">{c.title}</h3>
                <p className="mt-1 text-sm text-slate-400">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Practices */}
      <section className="mx-auto max-w-3xl px-6 py-20">
        <h2 className="text-2xl font-bold tracking-tight text-white">Engineering practices</h2>
        <ul className="mt-6 space-y-3">
          {practices.map((p) => (
            <li key={p} className="flex items-start gap-3 text-slate-300">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
              {p}
            </li>
          ))}
        </ul>
        <p className="mt-8 text-sm text-slate-500">
          Working through an enterprise security review? Reach out and we&apos;ll provide architecture
          details and a DPA.
        </p>
        <div className="mt-8">
          <Link href="/pricing" className={buttonClasses("primary", "lg")}>
            View enterprise plans
          </Link>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-slate-500">
        PrivacyOS — Privacy, Reputation, Identity &amp; Digital Risk Management.
      </footer>
    </main>
  );
}
