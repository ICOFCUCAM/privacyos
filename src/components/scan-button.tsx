"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Radar, Lock } from "lucide-react";
import { buttonClasses } from "@/components/ui";

/**
 * Triggers POST /api/discover and refreshes server data on completion.
 * Continuous scanning is a paid capability: when `canRescan` is false (free
 * tier) the control becomes an upgrade CTA, and a 402 from the API is shown as
 * an upgrade nudge rather than a raw error.
 */
export function ScanButton({ canRescan = true }: { canRescan?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  if (!canRescan) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Link href="/pricing?plan=plus" className={buttonClasses("primary", "md")}>
          <Lock className="h-4 w-4" /> Upgrade to re-scan
        </Link>
        <span className="text-xs text-slate-500">Continuous scanning is part of a paid plan.</span>
      </div>
    );
  }

  async function runScan() {
    setResult(null);
    const res = await fetch("/api/discover", { method: "POST" });
    if (res.status === 402) {
      setResult("Continuous scanning is a paid feature — upgrade to keep watching.");
      return;
    }
    const data = await res.json();
    setResult(
      `Found ${data.newExposures} new exposure(s), ${data.newThreats} new threat(s)` +
        (data.persisted ? " — saved." : " (demo: not persisted)."),
    );
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={runScan}
        disabled={pending}
        className={buttonClasses("primary", "md")}
      >
        <Radar className="h-4 w-4" />
        {pending ? "Scanning…" : "Run discovery scan"}
      </button>
      {result && <span className="text-xs text-slate-400">{result}</span>}
    </div>
  );
}
