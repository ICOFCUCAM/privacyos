import { Sparkles, Users, BrainCircuit } from "lucide-react";
import { buttonClasses, Card, PageHeader, RiskBadge, Pill } from "@/components/ui";
import { getDataSource } from "@/lib/data";
import { scoreToLevel } from "@/lib/scoring/risk-score";
import { titleCase } from "@/lib/ui";
import { synthesizeRecommendations } from "@/lib/agents/synthesis";
import { applyMemory } from "@/lib/agents/memory";
import { adviseOnPlan } from "@/lib/agents/llm-advisor";
import { resolveProvider } from "@/lib/agents/llm/provider";
import { approveRecommendationAction } from "@/app/dashboard/actions";

export const metadata = { title: "AI Recommendations" };

export default async function RecommendationsPage() {
  const ds = await getDataSource();
  const data = await ds.getDataset();
  const { recommendations } = data;
  // Synthesize the raw per-agent stream into one coordinated, de-duplicated,
  // confidence-ranked action plan (the orchestrator's job).
  const synth = synthesizeRecommendations(recommendations);
  const { rawCount, deduped, projectedImpact } = synth;
  // Memory loop: suppress work already in flight as a case, and re-weight by
  // each agent's approval track record (learning from history).
  const memory = applyMemory(synth.plan, data.cases);
  const plan = memory.plan;
  const maxPriority = Math.max(1, ...plan.map((r) => r.priority));

  // Analyst briefing — LLM-authored when a provider is configured, otherwise a
  // deterministic narrative (always returns something useful, no key required).
  const briefing = await adviseOnPlan(resolveProvider(), {
    subjectName: data.subject.displayName,
    exposureScore: data.riskScore.overall,
    threatLevel: scoreToLevel(data.riskScore.overall),
    activeThreats: data.threats.filter((t) => !t.acknowledged).length,
  }, plan);

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Recommendations"
        subtitle="One coordinated plan — the orchestrator dedupes and ranks every agent's input by impact × confidence × risk."
        actions={
          <div className="rounded-lg border border-border bg-bg-elevated px-4 py-2 text-right">
            <p className="text-xs text-slate-400">Projected score drop</p>
            <p className="text-xl font-bold text-risk-low">−{projectedImpact} pts</p>
          </div>
        }
      />

      {!ds.live && (
        <div className="rounded-lg border border-risk-medium/30 bg-risk-medium/10 px-4 py-2.5 text-xs text-risk-medium">
          Sample data — approvals are illustrative in demo mode. Connect your account to execute them and open real cases.
        </div>
      )}

      {/* Analyst briefing */}
      <Card className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/15">
          <BrainCircuit className="h-4 w-4 text-brand-fg" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-white">Analyst briefing</p>
            <Pill>{briefing.source === "llm" ? `${titleCase(briefing.provider)} AI` : "Deterministic"}</Pill>
          </div>
          <p className="mt-1 text-sm text-slate-300">{briefing.summary}</p>
          <p className="mt-1 text-xs text-slate-500">{briefing.rationale}</p>
        </div>
      </Card>

      {(deduped > 0 || memory.suppressed > 0 || memory.reinforcedAgents.length > 0) && (
        <p className="text-xs text-slate-500">
          Synthesized {rawCount} agent signals into {plan.length} prioritized action{plan.length === 1 ? "" : "s"}
          {deduped > 0 && <> — {deduped} duplicate/overlapping item{deduped === 1 ? "" : "s"} merged</>}
          {memory.suppressed > 0 && <> · {memory.suppressed} already in progress as a case, suppressed</>}
          {memory.reinforcedAgents.length > 0 && <> · {memory.reinforcedAgents.length} agent{memory.reinforcedAgents.length === 1 ? "" : "s"} reinforced from approval history</>}
          .
        </p>
      )}

      <div className="space-y-3">
        {plan.map((r) => (
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
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Pill>{titleCase(r.agent)} agent</Pill>
                <Pill>−{r.impact} pts</Pill>
                <Pill>{Math.round(r.confidence * 100)}% confidence</Pill>
                {r.corroboratingAgents.length > 1 && (
                  <Pill>
                    <Users className="mr-1 inline h-3 w-3" />
                    {r.corroboratingAgents.length} agents agree
                  </Pill>
                )}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1.5 max-w-xs flex-1 overflow-hidden rounded-full bg-bg-subtle">
                  <div className="h-full rounded-full bg-risk-low" style={{ width: `${(r.priority / maxPriority) * 100}%` }} />
                </div>
                <span className="text-[11px] text-slate-500">priority</span>
              </div>
            </div>
            <form action={approveRecommendationAction} className="shrink-0 self-center">
              <input type="hidden" name="id" value={r.id} />
              <button type="submit" className={buttonClasses("primary", "md")}>
                {r.actionLabel}
              </button>
            </form>
          </Card>
        ))}
        {plan.length === 0 && (
          <Card className="text-center text-sm text-slate-500">
            No open recommendations — the fleet has nothing pending your approval.
          </Card>
        )}
      </div>
    </div>
  );
}
