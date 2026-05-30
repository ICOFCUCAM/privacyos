"use client";

import { useState } from "react";
import { Sparkles, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import { cn, titleCase } from "@/lib/ui";

interface Recommendation {
  id: string;
  agent: string;
  title: string;
  rationale: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  impact: number;
  actionLabel: string;
}
interface Outcome {
  riskBefore: number;
  projectedRisk: number;
  recommendations: Recommendation[];
  agentStates: { kind: string; name: string; itemsHandled: number; status: string }[];
  log: string[];
  persisted?: boolean;
}

const riskText: Record<string, string> = {
  low: "text-risk-low",
  medium: "text-risk-medium",
  high: "text-risk-high",
  critical: "text-risk-critical",
};

export function ProtectPanel() {
  const [loading, setLoading] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  async function protect() {
    setLoading(true);
    setOutcome(null);
    try {
      const res = await fetch("/api/protect", { method: "POST" });
      setOutcome(await res.json());
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-brand/30 bg-gradient-to-br from-brand/10 to-transparent p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand/20">
          <Sparkles className="h-6 w-6 text-brand-fg" />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-white">Say the word. We handle the rest.</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">
          The autonomous agent fleet will scan your footprint, prioritize threats, and draft an action plan. You see outcomes, not complexity.
        </p>
        <button
          onClick={protect}
          disabled={loading}
          className="mx-auto mt-5 inline-flex items-center gap-2 rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand/90 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          {loading ? "Agents working…" : "Protect me"}
        </button>
      </div>

      {outcome && (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-4 rounded-xl border border-border bg-bg-elevated/60 p-5">
            <div className="text-center">
              <p className="text-xs uppercase text-slate-400">Risk now</p>
              <p className="text-3xl font-bold text-risk-high">{outcome.riskBefore}</p>
            </div>
            <ArrowRight className="h-6 w-6 text-slate-600" />
            <div className="text-center">
              <p className="text-xs uppercase text-slate-400">After plan</p>
              <p className="text-3xl font-bold text-risk-low">{outcome.projectedRisk}</p>
            </div>
            <div className="ml-4 rounded-lg bg-risk-low/10 px-3 py-2 text-sm font-semibold text-risk-low">
              −{outcome.riskBefore - outcome.projectedRisk} pts projected
            </div>
          </div>

          <div className="rounded-xl border border-border bg-bg-elevated/60 p-5">
            <h3 className="mb-3 font-semibold text-white">Action plan ({outcome.recommendations.length})</h3>
            <ul className="space-y-3">
              {outcome.recommendations.map((r) => (
                <li key={r.id} className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white">{r.title}</p>
                      <span className={cn("text-xs font-semibold", riskText[r.riskLevel])}>{titleCase(r.riskLevel)}</span>
                    </div>
                    <p className="text-sm text-slate-400">{r.rationale}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{titleCase(r.agent)} agent · −{r.impact} pts</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <details className="rounded-xl border border-border bg-bg-elevated/60 p-5">
            <summary className="cursor-pointer text-sm font-medium text-slate-300">Agent activity log</summary>
            <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap text-xs text-slate-500">{outcome.log.join("\n")}</pre>
          </details>
        </div>
      )}
    </div>
  );
}
