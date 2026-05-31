import Link from "next/link";
import {
  GitBranch, Play, UserCheck, ArrowUpRight, CheckCircle2, Clock, ArrowRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, PageHeader, SectionTitle } from "@/components/ui";
import { getDataSource } from "@/lib/data";
import { exposureToFinding, runPlaybooks, threatToFinding } from "@/lib/agents/playbooks";
import { buildWorkflows, workflowMetrics, type WorkflowStatus } from "@/lib/agents/workflows";
import { cn, titleCase } from "@/lib/ui";

export const metadata = { title: "Workflow Command" };

const STATUS_META: Record<WorkflowStatus, { label: string; cls: string; dot: string; icon: LucideIcon }> = {
  running: { label: "Running", cls: "text-risk-low", dot: "bg-risk-low", icon: Play },
  awaiting_approval: { label: "Awaiting approval", cls: "text-risk-medium", dot: "bg-risk-medium", icon: UserCheck },
  escalated: { label: "Escalated", cls: "text-risk-high", dot: "bg-risk-high", icon: ArrowUpRight },
  complete: { label: "Complete", cls: "text-slate-400", dot: "bg-slate-500", icon: CheckCircle2 },
};

export default async function WorkflowsPage() {
  const data = await (await getDataSource()).getDataset();
  const runs = runPlaybooks([
    ...data.exposures.map(exposureToFinding),
    ...data.threats.map(threatToFinding),
  ]);
  const workflows = buildWorkflows(runs);
  const metrics = workflowMetrics(workflows);

  return (
    <div className="space-y-5">
      <PageHeader
        icon={GitBranch}
        title="Workflow Command Center"
        subtitle="The operating layer connecting the agent fleet — every detection runs as a coordinated, multi-agent workflow."
      />

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="Active workflows" value={String(metrics.active)} tone="text-white" />
        <Kpi label="Awaiting approval" value={String(metrics.awaitingApproval)} tone="text-risk-medium" />
        <Kpi label="Escalated" value={String(metrics.escalated)} tone="text-risk-high" />
        <Kpi label="Completed" value={String(metrics.completedToday)} tone="text-risk-low" />
        <Kpi label="Analyst-hours saved" value={String(metrics.hoursSaved)} tone="text-risk-low" icon={<Clock className="h-3.5 w-3.5 text-slate-400" />} />
      </div>

      {/* Live workflows */}
      <Card className="p-4">
        <SectionTitle
          title="Live workflows"
          subtitle="Each finding flows through a coordinated agent chain"
          action={
            <Link href="/dashboard/playbooks" className="text-xs font-medium text-brand-fg hover:underline">
              Playbook catalog
            </Link>
          }
        />
        {workflows.length === 0 ? (
          <p className="text-sm text-slate-500">No active workflows — nothing currently matches a playbook trigger.</p>
        ) : (
          <ul className="space-y-2.5">
            {workflows.map((w) => {
              const m = STATUS_META[w.status];
              const Icon = m.icon;
              return (
                <li key={w.id} className="rounded-xl border border-border bg-bg-subtle/40 p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{w.name}</span>
                      <span className="rounded-md bg-bg-subtle px-1.5 py-0.5 text-[10px] font-medium text-slate-400 ring-1 ring-border">
                        {titleCase(w.owner)} agent
                      </span>
                    </div>
                    <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold", m.cls)}>
                      <Icon className="h-3.5 w-3.5" />
                      {m.label}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    Trigger: <span className="text-slate-400">{w.trigger}</span>
                  </p>

                  {/* Agent chain */}
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    {w.agents.map((a, i) => (
                      <span key={a} className="inline-flex items-center gap-1">
                        <span className="rounded bg-brand/12 px-1.5 py-0.5 text-[10px] font-medium text-brand-fg ring-1 ring-brand/20">
                          {titleCase(a)}
                        </span>
                        {i < w.agents.length - 1 && <ArrowRight className="h-3 w-3 text-slate-600" />}
                      </span>
                    ))}
                  </div>

                  {/* Progress */}
                  <div className="mt-2.5 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-subtle">
                      <div className={cn("h-full rounded-full", w.status === "complete" ? "bg-risk-low" : "bg-brand")} style={{ width: `${(w.stepsDone / w.totalSteps) * 100}%` }} />
                    </div>
                    <span className="shrink-0 text-[11px] text-slate-500">{w.stepsDone}/{w.totalSteps} steps automated</span>
                    {w.blocked && (
                      <Link href="/dashboard/recommendations" className="shrink-0 rounded-md bg-risk-medium/15 px-2 py-0.5 text-[11px] font-semibold text-risk-medium ring-1 ring-risk-medium/30 hover:bg-risk-medium/25">
                        Review
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Kpi({ label, value, tone, icon }: { label: string; value: string; tone?: string; icon?: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</span>
        {icon}
      </div>
      <p className={cn("mt-1 text-2xl font-bold", tone)}>{value}</p>
    </Card>
  );
}
