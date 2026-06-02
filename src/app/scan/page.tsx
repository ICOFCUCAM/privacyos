import Link from "next/link";
import Image from "next/image";
import { FreeScan } from "./free-scan";

export const metadata = {
  title: "Free Privacy & Exposure Scan",
  description: "See what's exposed about you — a free privacy & exposure scan with your protection score. No signup, no card.",
};

export default function FreeScanPage() {
  return (
    <main id="content" className="bg-grid min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/PrivacyLogo.png" alt="" width={28} height={28} className="h-7 w-7" />
          <span className="text-lg font-bold text-white">PrivacyOS</span>
        </Link>
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
