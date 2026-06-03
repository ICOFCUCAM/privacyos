import Link from "next/link";
import {
  History, ArrowLeft, CheckCircle2, UserCheck, XCircle, Clock, ArrowRight, Bot,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, PageHeader } from "@/components/ui";
import { listWorkflowHistory } from "@/lib/agents/workflow-history-store";
import { historyStats } from "@/lib/agents/workflow-history";
import type { RunStatus } from "@/lib/agents/workflow-builder";
import { cn } from "@/lib/ui";

export const metadata = { title: "Workflow History" };

const STATUS_META: Record<RunStatus, { cls: string; ring: string; icon: LucideIcon }> = {
  success: { cls: "text-risk-low", ring: "ring-risk-low/30 bg-risk-low/10", icon: CheckCircle2 },
  paused: { cls: "text-risk-medium", ring: "ring-risk-medium/30 bg-risk-medium/10", icon: UserCheck },
  stopped: { cls: "text-risk-high", ring: "ring-risk-high/30 bg-risk-high/10", icon: XCircle },
  failed: { cls: "text-risk-high", ring: "ring-risk-high/30 bg-risk-high/10", icon: XCircle },
};

export default async function WorkflowHistoryPage() {
  const entries = await listWorkflowHistory();
  const stats = historyStats(entries);

  return (
    <div className="space-y-5">
      <PageHeader
        icon={History}
        title="Workflow History"
        subtitle="Every workflow execution is stored — the audit trail of what ran, when, with which agents and to what outcome."
        actions={
          <Link
            href="/dashboard/workflow-builder"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg-elevated px-3 py-2 text-xs font-medium text-slate-300 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to builder
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Executions" value={String(stats.total)} tone="text-white" />
        <Kpi label="Success Rate" value={`${stats.successRate}%`} tone={stats.successRate >= 90 ? "text-risk-low" : stats.successRate >= 70 ? "text-risk-medium" : "text-risk-high"} />
        <Kpi label="Awaiting Approval" value={String(stats.awaitingApproval)} tone={stats.awaitingApproval > 0 ? "text-risk-medium" : "text-risk-low"} />
        <Kpi label="Agents Engaged" value={String(stats.agentsEngaged)} tone="text-risk-low" />
      </div>

      {/* History cards */}
      {entries.length === 0 ? (
        <Card className="p-6 text-center text-sm text-slate-500">No executions stored yet.</Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((e) => {
            const m = STATUS_META[e.status];
            const Icon = m.icon;
            return (
              <Card key={e.run.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-mono text-slate-500">Workflow {e.number}</p>
                    <p className="truncate text-sm font-semibold text-white">{e.name}</p>
                  </div>
                  <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1", m.cls, m.ring)}>
                    <Icon className="h-3 w-3" /> {e.outcomeLabel}
                  </span>
                </div>

                {/* Started / Completed */}
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <p className="text-[9px] uppercase tracking-wide text-slate-500">Started</p>
                    <p className="font-mono text-slate-200">{e.startedLabel}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wide text-slate-500">Completed</p>
                    <p className="font-mono text-slate-200">{e.completedLabel}</p>
                  </div>
                </div>

                {/* Agents */}
                <div className="mt-3">
                  <p className="mb-1 text-[9px] uppercase tracking-wide text-slate-500">Agents</p>
                  {e.agentLabels.length === 0 ? (
                    <p className="text-[11px] text-slate-600">—</p>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1">
                      {e.agentLabels.map((a, i) => (
                        <span key={`${a}-${i}`} className="inline-flex items-center gap-1">
                          <span className="inline-flex items-center gap-1 rounded bg-brand/12 px-1.5 py-0.5 text-[10px] font-medium text-brand-fg ring-1 ring-brand/20">
                            <Bot className="h-3 w-3" /> {a}
                          </span>
                          {i < e.agentLabels.length - 1 && <ArrowRight className="h-3 w-3 text-slate-600" />}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <p className="mt-3 flex items-center gap-1 text-[10px] text-slate-500">
                  <Clock className="h-3 w-3" /> {e.run.durationSec}s · {e.run.outputs.length} output{e.run.outputs.length === 1 ? "" : "s"}
                  {e.run.errors.length > 0 && <span className="text-risk-high"> · {e.run.errors.length} error{e.run.errors.length === 1 ? "" : "s"}</span>}
                </p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Card className="p-4">
      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</span>
      <p className={cn("mt-1 text-2xl font-bold", tone)}>{value}</p>
    </Card>
  );
}
