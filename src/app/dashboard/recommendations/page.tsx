import { Sparkles } from "lucide-react";
import { buttonClasses, Card, PageHeader, RiskBadge, Pill } from "@/components/ui";
import { getDataSource } from "@/lib/data";
import { titleCase } from "@/lib/ui";
import { approveRecommendationAction } from "@/app/dashboard/actions";

export const metadata = { title: "AI Recommendations" };

export default async function RecommendationsPage() {
  const { recommendations } = await (await getDataSource()).getDataset();
  const totalImpact = recommendations.reduce((s, r) => s + r.impact, 0);
  const maxImpact = Math.max(1, ...recommendations.map((r) => r.impact));

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Recommendations"
        subtitle="Prioritized actions from your agents. Approve to let PrivacyOS execute them."
        actions={
          <div className="rounded-lg border border-border bg-bg-elevated px-4 py-2 text-right">
            <p className="text-xs text-slate-400">Projected score drop</p>
            <p className="text-xl font-bold text-risk-low">−{totalImpact} pts</p>
          </div>
        }
      />

      <div className="space-y-3">
        {recommendations.map((r) => (
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
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1.5 max-w-xs flex-1 overflow-hidden rounded-full bg-bg-subtle">
                  <div className="h-full rounded-full bg-risk-low" style={{ width: `${(r.impact / maxImpact) * 100}%` }} />
                </div>
                <span className="text-[11px] text-slate-500">impact</span>
              </div>
            </div>
            <form action={approveRecommendationAction} className="shrink-0 self-center">
              <input type="hidden" name="id" value={r.id} />
              <button
                type="submit"
                className={buttonClasses("primary", "md")}
              >
                {r.actionLabel}
              </button>
            </form>
          </Card>
        ))}
      </div>
    </div>
  );
}
