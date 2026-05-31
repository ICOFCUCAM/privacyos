"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { buttonClasses } from "@/components/ui";

/** Triggers POST /api/domains/scan (DNS/email-auth check) and refreshes data. */
export function DomainScanButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  async function run() {
    setResult(null);
    const res = await fetch("/api/domains/scan", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setResult(data.error ?? "Scan failed.");
      return;
    }
    setResult(
      `${data.domain}: ${data.risks} risk(s) · ${data.source === "dns" ? "live DNS" : "sample"}` +
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
        <Globe className="h-4 w-4" />
        {pending ? "Checking DNS…" : "Run domain scan"}
      </button>
      {result && <span className="max-w-xs text-right text-xs text-slate-400">{result}</span>}
    </div>
  );
}
