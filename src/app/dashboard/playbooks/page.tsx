import Link from "next/link";
import {
  Workflow, Search, Brain, Zap, ArrowUpRight, Eye, CheckCircle2, UserCheck, ArrowRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, PageHeader, SectionTitle } from "@/components/ui";
import { AutomationTabs } from "@/components/automation-tabs";
import { getDataSource } from "@/lib/data";
import {
  exposureToFinding, runPlaybooks, summarizeRuns, threatToFinding,
  PLAYBOOKS, type ExecutedStep, type StepKind,
} from "@/lib/agents/playbooks";
import { cn, titleCase } from "@/lib/ui";

export const metadata = { title: "Response Playbooks" };

const STEP_ICON: Record<StepKind, LucideIcon> = {
  detect: Search,
  decide: Brain,
  act: Zap,
  escalate: ArrowUpRight,
  monitor: Eye,
};

const STEP_COLOR: Record<StepKind, string> = {
  detect: "text-slate-300 bg-slate-500/10 ring-slate-500/30",
  decide: "text-brand-fg bg-brand/10 ring-brand/30",
  act: "text-risk-low bg-risk-low/10 ring-risk-low/30",
  escalate: "text-risk-high bg-risk-high/10 ring-risk-high/30",
  monitor: "text-risk-medium bg-risk-medium/10 ring-risk-medium/30",
};

export default async function PlaybooksPage() {
  const data = await (await getDataSource()).getDataset();
  const findings = [
    ...data.exposures.map(exposureToFinding),
    ...data.threats.map(threatToFinding),
  ];
  const runs = runPlaybooks(findings);
  const summary = summarizeRuns(runs);
  // Show the most consequential runs first, capped for a focused operations view.
  const topRuns = runs.slice(0, 8);

  return (
    <div className="space-y-4">
      <AutomationTabs />
      <PageHeader
        icon={Workflow}
        title="Autonomous Response Playbooks"
        subtitle="Detect → decide → act → escalate. Your agents run these workflows continuously; you approve only what's irreversible."
      />

      {/* Automation moat KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Active playbooks</span>
          <p className="mt-1 text-2xl font-bold text-white">{summary.activePlaybooks}<span className="text-base text-slate-500">/{PLAYBOOKS.length}</span></p>
          <p className="text-[11px] text-slate-500">triggered by live findings</p>
        </Card>
        <Card className="p-4">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Workflow runs</span>
          <p className="mt-1 text-2xl font-bold text-white">{summary.totalRuns}</p>
          <p className="text-[11px] text-slate-500">{summary.autonomousRuns} fully autonomous</p>
        </Card>
        <Card className="p-4">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Automation rate</span>
          <p className="mt-1 text-2xl font-bold text-risk-low">{summary.automationRate}%</p>
          <p className="text-[11px] text-slate-500">{summary.autoSteps} of {summary.totalSteps} steps auto-run</p>
        </Card>
        <Card className="p-4">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Awaiting approval</span>
          <p className="mt-1 text-2xl font-bold text-white">{summary.approvalSteps}</p>
          <p className="text-[11px] text-slate-500">irreversible / high-risk steps</p>
        </Card>
      </div>

      {/* Live workflow executions */}
      <Card className="p-4">
        <SectionTitle
          title="Live workflow executions"
          subtitle="Each finding is matched to a playbook and walked step by step"
        />
        {topRuns.length === 0 ? (
          <p className="text-sm text-slate-500">No findings currently match a playbook trigger.</p>
        ) : (
          <ul className="space-y-3">
            {topRuns.map((run, i) => (
              <li key={`${run.playbookId}-${run.finding.id}-${i}`} className="rounded-xl border border-border bg-bg-subtle/40 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{run.playbookName}</span>
                    <span className="rounded-md bg-bg-subtle px-1.5 py-0.5 text-[10px] font-medium text-slate-400 ring-1 ring-border">
                      {titleCase(run.owner)} agent
                    </span>
                  </div>
                  <span className={cn(
                    "inline-flex items-center gap-1 text-[11px] font-semibold",
                    run.fullyAutonomous ? "text-risk-low" : "text-risk-medium",
                  )}>
                    {run.fullyAutonomous
                      ? <><CheckCircle2 className="h-3.5 w-3.5" /> Fully autonomous</>
                      : <><UserCheck className="h-3.5 w-3.5" /> {run.approvalSteps} need approval</>}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Trigger: <span className="text-slate-400">{run.finding.title}</span> · {titleCase(run.finding.riskLevel)} risk
                </p>
                <ol className="mt-3 space-y-1.5">
                  {run.steps.map((step, si) => (
                    <StepRow key={si} step={step} />
                  ))}
                </ol>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Playbook catalog */}
      <Card className="p-4">
        <SectionTitle
          title="Playbook catalog"
          subtitle="The standing response workflows the fleet can execute"
          action={
            <Link href="/dashboard/agents" className="text-xs font-medium text-brand-fg hover:underline">
              View agents
            </Link>
          }
        />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {PLAYBOOKS.map((p) => {
            const active = runs.some((r) => r.playbookId === p.id);
            return (
              <div key={p.id} className="rounded-xl border border-border bg-bg-subtle/40 p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-white">{p.name}</span>
                  <span className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1",
                    active ? "bg-risk-low/10 text-risk-low ring-risk-low/30" : "bg-slate-500/10 text-slate-400 ring-slate-500/30",
                  )}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-risk-low" : "bg-slate-500")} />
                    {active ? "Active" : "Standing"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">{p.description}</p>
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  {p.steps.map((s, si) => {
                    const Icon = STEP_ICON[s.kind];
                    return (
                      <span key={si} className="inline-flex items-center gap-1">
                        <span className={cn("flex h-5 w-5 items-center justify-center rounded ring-1", STEP_COLOR[s.kind])}>
                          <Icon className="h-3 w-3" />
                        </span>
                        {si < p.steps.length - 1 && <ArrowRight className="h-3 w-3 text-slate-600" />}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function StepRow({ step }: { step: ExecutedStep }) {
  const Icon = STEP_ICON[step.kind];
  return (
    <li className="relative flex items-start gap-2.5 pl-0.5">
      <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded ring-1", STEP_COLOR[step.kind])}>
        <Icon className="h-3 w-3" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-200">{step.label}</span>
          <span className={cn(
            "shrink-0 text-[10px] font-semibold uppercase tracking-wide",
            step.execution === "auto" ? "text-risk-low" : step.execution === "approval" ? "text-risk-medium" : "text-slate-500",
          )}>
            {step.execution === "auto" ? "Auto" : step.execution === "approval" ? "Approval" : "Skipped"}
          </span>
        </div>
        <p className="text-[10px] text-slate-500">{step.reason}</p>
      </div>
    </li>
  );
}
