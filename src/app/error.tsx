"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[privacyos] route error:", error);
  }, [error]);

  return (
    <main className="bg-grid flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-risk-high/15 ring-1 ring-risk-high/30">
        <AlertTriangle className="h-7 w-7 text-risk-high" />
      </span>
      <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-risk-high">Something went wrong</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
        We hit an unexpected error.
      </h1>
      <p className="mx-auto mt-3 max-w-md text-slate-400">
        The issue has been logged. You can retry, or head back to your dashboard.
        {error.digest && <span className="mt-2 block text-xs text-slate-600">Ref: {error.digest}</span>}
      </p>
      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand/90"
        >
          <RotateCcw className="h-4 w-4" /> Try again
        </button>
        <Link href="/dashboard" className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-bg-elevated">
          Go to dashboard
        </Link>
      </div>
    </main>
  );
}
