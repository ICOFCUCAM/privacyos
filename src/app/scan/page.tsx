import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { FreeScan } from "./free-scan";

export const metadata = {
  title: "Free Privacy & Exposure Scan",
  description: "See what's exposed about you — a free privacy & exposure scan with your protection score. No signup, no card.",
};

export default function FreeScanPage() {
  return (
    <main id="content" className="bg-grid min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <BrandMark size={32} wordmarkClass="text-xl" />
        <Link href="/pricing" className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-bg-elevated">
          Pricing
        </Link>
      </header>
      <div className="mx-auto max-w-3xl px-6 py-10">
        <FreeScan />
      </div>
    </main>
  );
}
