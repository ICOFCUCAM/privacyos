import Link from "next/link";
import { ShieldAlert, ArrowRight } from "lucide-react";
import { buttonClasses } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="bg-grid flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/15 ring-1 ring-brand/30">
        <ShieldAlert className="h-7 w-7 text-brand-fg" />
      </span>
      <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-brand-fg">404 — Off the grid</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
        This page couldn&apos;t be found.
      </h1>
      <p className="mx-auto mt-3 max-w-md text-slate-400">
        The address may be wrong or the page has moved. Your protection is still active.
      </p>
      <div className="mt-8 flex items-center gap-3">
        <Link href="/" className={buttonClasses("primary", "md", "px-5 py-2.5")}>
          Back home
        </Link>
        <Link href="/dashboard" className={buttonClasses("secondary", "md", "px-5 py-2.5")}>
          Open dashboard <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </main>
  );
}
