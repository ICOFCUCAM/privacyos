import { Sparkles, Users, BrainCircuit, Clock, Target, Gauge, Zap, CalendarClock } from "lucide-react";
import { buttonClasses, Card, PageHeader, RiskBadge } from "@/components/ui";
import { getDataSource } from "@/lib/data";
import { scoreToLevel } from "@/lib/scoring/risk-score";
import { cn, titleCase } from "@/lib/ui";
import { synthesizeRecommendations } from "@/lib/agents/synthesis";
import { applyMemory } from "@/lib/agents/memory";
import { actionEconomics, missionBoard } from "@/lib/agents/action-economics";
import { adviseOnPlan } from "@/lib/agents/llm-advisor";
import { resolveProvider } from "@/lib/agents/llm/provider";
import { approveRecommendationAction } from "@/app/dashboard/actions";

export const metadata = { title: "AI Recommendations" };

export default async function RecommendationsPage() {
  const ds = await getDataSource();
  const data = await ds.getDataset();
  const { recommendations } = data;
  // Orchestrator: synthesize the raw per-agent stream into one coordinated,
  // de-duplicated, confidence-ranked plan; then apply the memory loop.
  const synth = synthesizeRecommendations(recommendations);
  const { rawCount, deduped } = synth;
  const memory = applyMemory(synth.plan, data.cases);
  const plan = memory.plan;
  const maxPriority = Math.max(1, ...plan.map((r) => r.priority));
  const board = missionBoard(data.riskScore.overall, plan);

  const briefing = await adviseOnPlan(resolveProvider(), {
    subjectName: data.subject.displayName,
    exposureScore: data.riskScore.overall,
    threatLevel: scoreToLevel(data.riskScore.overall),
    activeThreats: data.threats.filter((t) => !t.acknowledged).length,
  }, plan);

  return (
    <div className="space-y-4">
      <PageHeader
        title="AI Recommendations"
        subtitle="One coordinated plan — the orchestrator dedupes and ranks every agent's input by impact × confidence × risk."
      />

      {/* ── Mission Board ──────────────────────────────────────────────────── */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-fg">Mission Board</p>
          <span className="text-[11px] text-slate-500">
            Analyst briefing · {briefing.source === "llm" ? `${titleCase(briefing.provider)} AI` : "Deterministic"}
          </span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Mission label="Exposure score" value={String(board.exposureScore)} tone={`text-risk-${scoreToLevel(board.exposureScore)}`} />
          <Mission label="After actions" value={String(board.projectedScore)} tone="text-risk-low" sub={`−${board.exposureScore - board.projectedScore} pts`} />
          <Mission label="Actions required" value={String(board.actionsRequired)} />
          <Mission label="Est. completion" value={`${board.estimatedMinutes} min`} icon={<Clock className="h-3.5 w-3.5 text-slate-400" />} />
          <Mission label="Plan confidence" value={`${board.confidence}%`} tone={board.confidence >= 80 ? "text-risk-low" : "text-risk-medium"} />
        </div>
        <p className="mt-3 border-t border-border pt-3 text-sm text-slate-300">{briefing.summary}</p>
        <p className="mt-1 text-xs text-slate-500">{briefing.rationale}</p>
      </Card>

      {!ds.live && (
        <div className="rounded-lg border border-risk-medium/30 bg-risk-medium/10 px-4 py-2 text-xs text-risk-medium">
          Sample data — approvals are illustrative in demo mode. Connect your account to execute them and open real cases.
        </div>
      )}

      {(deduped > 0 || memory.suppressed > 0 || memory.reinforcedAgents.length > 0) && (
        <p className="text-xs text-slate-500">
          Synthesized {rawCount} agent signals into {plan.length} prioritized action{plan.length === 1 ? "" : "s"}
          {deduped > 0 && <> — {deduped} duplicate/overlapping item{deduped === 1 ? "" : "s"} merged</>}
          {memory.suppressed > 0 && <> · {memory.suppressed} already in progress as a case, suppressed</>}
          {memory.reinforcedAgents.length > 0 && <> · {memory.reinforcedAgents.length} agent{memory.reinforcedAgents.length === 1 ? "" : "s"} reinforced from history</>}
          .
        </p>
      )}

      {/* ── Action cards (compact, dense) ──────────────────────────────────── */}
      <div className="space-y-2.5">
        {plan.map((r) => {
          const econ = actionEconomics(r);
          return (
            <Card key={r.id} className="p-3">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/15">
                  <Sparkles className="h-4 w-4 text-brand" />
                </div>

                <div className="min-w-0 flex-1">
                  {/* Title row */}
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[15px] font-semibold text-white">{r.title}</p>
                    <RiskBadge level={r.riskLevel} />
                    <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-slate-500">
                      priority
                      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-bg-subtle">
                        <span className="block h-full rounded-full bg-risk-low" style={{ width: `${(r.priority / maxPriority) * 100}%` }} />
                      </span>
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">{r.rationale}</p>

                  {/* Attribution + cost/benefit (compact inline) */}
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
                    <Stat icon={<Users className="h-3 w-3" />} label={`${titleCase(r.agent)} agent`} />
                    <Stat icon={<Gauge className="h-3 w-3 text-risk-low" />} label="Confidence" value={`${Math.round(r.confidence * 100)}%`} />
                    <Stat icon={<Target className="h-3 w-3 text-risk-low" />} label="Risk −" value={`${econ.riskReduction} pts`} />
                    <Stat icon={<Clock className="h-3 w-3 text-slate-400" />} label="Effort" value={`${econ.effortMinutes} min`} />
                    <Stat icon={<Zap className="h-3 w-3 text-risk-low" />} label="Success" value={`${econ.successProbability}%`} />
                  </div>

                  {/* Contributors (multi-agent feel) */}
                  {r.corroboratingAgents.length > 1 && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] uppercase tracking-wide text-slate-500">Contributors</span>
                      {r.corroboratingAgents.map((a) => (
                        <span key={a} className="rounded bg-bg-subtle px-1.5 py-0.5 text-[10px] text-slate-300 ring-1 ring-border">{titleCase(a)}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Approval workflow */}
                <div className="flex shrink-0 flex-col items-stretch gap-1.5">
                  <form action={approveRecommendationAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <button type="submit" className={cn(buttonClasses("primary", "sm"), "w-full")}>{r.actionLabel}</button>
                  </form>
                  <div className="flex gap-1.5">
                    <form action={approveRecommendationAction} className="flex-1">
                      <input type="hidden" name="id" value={r.id} />
                      <button type="submit" title="Auto-execute" className={cn(buttonClasses("secondary", "sm"), "w-full")}>
                        {econ.autoExecutable ? <><Zap className="h-3 w-3" /> Auto</> : <>Approve</>}
                      </button>
                    </form>
                    <button type="button" title="Schedule for later" disabled className={cn(buttonClasses("secondary", "sm"), "cursor-not-allowed opacity-50")}>
                      <CalendarClock className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
        {plan.length === 0 && (
          <Card className="text-center text-sm text-slate-500">
            No open recommendations — the fleet has nothing pending your approval.
          </Card>
        )}
      </div>
    </div>
  );
}

function Mission({ label, value, tone, sub, icon }: { label: string; value: string; tone?: string; sub?: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-bg-subtle/50 p-2.5">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[10px] uppercase tracking-wide text-slate-500">{label}</span>
      </div>
      <p className={cn("mt-0.5 text-lg font-bold text-white", tone)}>{value}</p>
      {sub && <p className="text-[10px] font-semibold text-risk-low">{sub}</p>}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-slate-400">
      {icon}
      <span>{label}</span>
      {value && <span className="font-semibold text-white">{value}</span>}
    </span>
  );
}
