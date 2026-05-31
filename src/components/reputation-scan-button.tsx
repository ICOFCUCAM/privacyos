"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Radar } from "lucide-react";
import { buttonClasses } from "@/components/ui";

/** Triggers POST /api/reputation/scan and refreshes server data on completion. */
export function ReputationScanButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  async function run() {
    setResult(null);
    const res = await fetch("/api/reputation/scan", { method: "POST" });
    const data = await res.json();
    setResult(
      `${data.mentions} mention(s), ${data.negative} negative · ${data.source === "gdelt" ? "live news" : "sample"}` +
        (data.persisted ? " — saved." : " (demo: not persisted)."),
    );
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={run}
        disabled={pending}
        className={buttonClasses("primary", "md")}
      >
        <Radar className="h-4 w-4" />
        {pending ? "Scanning news…" : "Run reputation scan"}
      </button>
      {result && <span className="max-w-xs text-right text-xs text-slate-400">{result}</span>}
    </div>
  );
}
