"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Database, Loader2 } from "lucide-react";
import { buttonClasses } from "@/components/ui";
import { seedSuiteDataAction } from "@/app/dashboard/settings/actions";

/** Admin control to seed the producer-less suite tables with sample data. */
export function SuiteSeedControl() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ message?: string; error?: string } | null>(null);

  function onSeed() {
    start(async () => {
      const res = await seedSuiteDataAction();
      setResult(res);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-400">
        Populate the Family, Travel, Employee, Credential, Vendor and ReputationOS tables with the sample dataset for
        your account. Idempotent — only empty tables are seeded.
      </p>
      <button onClick={onSeed} disabled={pending} className={buttonClasses("secondary", "md")}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
        {pending ? "Seeding…" : "Load sample suite data"}
      </button>
      {result?.message && <p className="text-xs text-risk-low">{result.message}</p>}
      {result?.error && <p className="text-xs text-risk-medium">{result.error}</p>}
    </div>
  );
}
