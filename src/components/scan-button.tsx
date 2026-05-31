"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Radar } from "lucide-react";
import { buttonClasses } from "@/components/ui";

/** Triggers POST /api/discover and refreshes server data on completion. */
export function ScanButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  async function runScan() {
    setResult(null);
    const res = await fetch("/api/discover", { method: "POST" });
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
