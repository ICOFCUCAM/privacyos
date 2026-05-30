import Link from "next/link";
import type { Metadata } from "next";
import { Shield } from "lucide-react";
import { PricingTable } from "@/components/pricing";

export const metadata: Metadata = {
  title: "Pricing — PrivacyOS",
  description:
    "Plans for individuals, families, professionals, public figures, executives and enterprises. Save 20% with annual billing.",
};

export default function PricingPage() {
  return (
    <main className="bg-grid min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-brand" />
          <span className="text-lg font-bold text-white">PrivacyOS</span>
        </Link>
        <Link
          href="/dashboard"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand/90"
        >
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

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <PricingTable />
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
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

      <footer className="border-t border-border py-8 text-center text-sm text-slate-500">
        PrivacyOS — Privacy, Reputation, Identity &amp; Digital Risk Management.
      </footer>
    </main>
  );
}
