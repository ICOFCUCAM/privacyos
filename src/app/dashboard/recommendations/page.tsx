import { Sparkles } from "lucide-react";
import { Card, RiskBadge, Pill } from "@/components/ui";
import { demoRecommendations } from "@/lib/data/demo";
import { titleCase } from "@/lib/ui";

export default function RecommendationsPage() {
  const totalImpact = demoRecommendations.reduce((s, r) => s + r.impact, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Recommendations</h1>
          <p className="mt-1 text-sm text-slate-400">
            Prioritized actions from your agents. Approve to let PrivacyOS execute them.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-bg-elevated px-4 py-2 text-right">
          <p className="text-xs text-slate-400">Projected score drop</p>
          <p className="text-xl font-bold text-risk-low">−{totalImpact} pts</p>
        </div>
      </div>

      <div className="space-y-3">
        {demoRecommendations.map((r) => (
          <Card key={r.id} className="flex items-start gap-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/15">
              <Sparkles className="h-4 w-4 text-brand" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-white">{r.title}</p>
                <RiskBadge level={r.riskLevel} />
              </div>
              <p className="mt-1 text-sm text-slate-400">{r.rationale}</p>
              <div className="mt-2 flex items-center gap-2">
                <Pill>{titleCase(r.agent)} agent</Pill>
                <Pill>−{r.impact} pts</Pill>
              </div>
            </div>
            <button className="shrink-0 self-center rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand/90">
              {r.actionLabel}
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}
