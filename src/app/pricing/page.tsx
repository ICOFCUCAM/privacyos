import Link from "next/link";
import type { Metadata } from "next";
import { Shield } from "lucide-react";
import { PricingTable } from "@/components/pricing";
import { TrustStrip } from "@/components/landing-sections";
import { buttonClasses } from "@/components/ui";

const faqs: { q: string; a: string }[] = [
  {
    q: "Can I change plans or cancel anytime?",
    a: "Yes. Upgrade, downgrade or cancel from Settings → Billing at any time. Changes prorate automatically and you keep access through the current period.",
  },
  {
    q: "What's the difference between the suites?",
    a: "PrivacyOS covers personal privacy & removals; ReputationOS handles search/news/sentiment; ExecutiveOS adds doxxing, deepfake and travel-risk protection; BusinessOS protects organizations. Most customers start with one and add suites as they grow.",
  },
  {
    q: "Do the AI agents really run continuously?",
    a: "Yes — the autonomous agent fleet runs on a 24/7 schedule, continuously discovering exposures, filing removals, re-checking results and raising alerts. You review outcomes, not busywork.",
  },
  {
    q: "Is my data secure?",
    a: "Every tenant's data is isolated by row-level security, access is role-based, and the platform is built privacy-first with GDPR/CCPA-ready workflows and an append-only audit log.",
  },
  {
    q: "What do annual contracts include?",
    a: "Annual billing saves 20%. Executive plans include a setup consultation, Enterprise plans include onboarding, and multi-year contracts are available.",
  },
];

export const metadata: Metadata = {
  title: "Pricing — PrivacyOS",
  description:
    "Plans for individuals, families, professionals, public figures, executives and enterprises. Save 20% with annual billing.",
};

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan: recommendedPlanId } = await searchParams;
  return (
    <main className="bg-grid min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-brand" />
          <span className="text-lg font-bold text-white">PrivacyOS</span>
        </Link>
        <Link href="/dashboard" className={buttonClasses("primary", "md")}>
          Open Dashboard
        </Link>
      </header>

      <section className="mx-auto max-w-3xl px-6 pb-10 pt-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Protection for everyone, at every scale
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-400">
          From individuals to global enterprises — pick the protection tier that fits.
          Every paid plan can add an autonomous AI Agent. Annual billing saves 20%.
        </p>
      </section>

      <div className="mb-12">
        <TrustStrip />
      </div>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <PricingTable recommendedPlanId={recommendedPlanId} />
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="rounded-2xl border border-border bg-bg-elevated/60 p-6 text-sm text-slate-400">
          <h3 className="mb-2 font-semibold text-white">Annual contracts &amp; enterprise</h3>
          <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            <li>• 20% discount on annual billing</li>
            <li>• Executive plans include a setup consultation</li>
            <li>• Enterprise plans include onboarding</li>
            <li>• Multi-year contracts available</li>
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-6 pb-24">
        <h2 className="mb-8 text-center text-3xl font-bold tracking-tight text-white">
          Frequently asked questions
        </h2>
        <div className="divide-y divide-border rounded-2xl border border-border bg-bg-elevated/40">
          {faqs.map((f) => (
            <details key={f.q} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-white">
                {f.q}
                <span className="text-slate-500 transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">{f.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link href="/dashboard/assistant" className={buttonClasses("primary", "lg")}>
            Get Protected
          </Link>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-slate-500">
        PrivacyOS — Privacy, Reputation, Identity &amp; Digital Risk Management.
      </footer>
    </main>
  );
}
