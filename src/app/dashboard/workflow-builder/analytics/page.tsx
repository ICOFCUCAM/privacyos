import Link from "next/link";
import {
  TrendingUp, ArrowLeft, Clock, FolderKanban, Zap, CheckCircle2, Bot, ShieldCheck, DollarSign,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, PageHeader, SectionTitle } from "@/components/ui";
import { listWorkflowHistory } from "@/lib/agents/workflow-history-store";
import { workflowAnalytics } from "@/lib/agents/workflow-analytics";
import { cn } from "@/lib/ui";

export const metadata = { title: "Workflow Analytics" };

export default async function WorkflowAnalyticsPage() {
  const entries = await listWorkflowHistory();
  const a = workflowAnalytics(entries);

  return (
    <div className="space-y-5">
      <PageHeader
        icon={TrendingUp}
        title="Workflow Analytics"
        subtitle="The ROI of automation — the analyst time, casework and risk the workflow fleet took off your plate."
        actions={
          <Link
            href="/dashboard/workflow-builder"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg-elevated px-3 py-2 text-xs font-medium text-slate-300 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to builder
          </Link>
        }
      />

      {/* ROI headline */}
      <Card className="flex flex-wrap items-center justify-between gap-3 border-brand/30 bg-brand/10 p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/20 text-brand">
            <DollarSign className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Estimated labour cost avoided</p>
            <p className="text-2xl font-bold text-white">${a.costSavedUsd.toLocaleString()}</p>
          </div>
        </div>
        <p className="text-xs text-slate-400">
          {a.timeSavedHours}h of analyst time saved across {a.totalRuns} execution{a.totalRuns === 1 ? "" : "s"}.
        </p>
      </Card>

      {/* The six metrics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Metric icon={Clock} label="Time Saved" value={`${a.timeSavedHours}h`} tone="text-white" hint="Analyst hours automated away" />
        <Metric icon={FolderKanban} label="Cases Automated" value={String(a.casesAutomated)} tone="text-white" hint="Cases opened without a human" />
        <Metric icon={Zap} label="Actions Automated" value={String(a.actionsAutomated)} tone="text-white" hint="Action blocks executed" />
        <Metric icon={CheckCircle2} label="Success Rate" value={`${a.successRate}%`} tone={a.successRate >= 90 ? "text-risk-low" : a.successRate >= 70 ? "text-risk-medium" : "text-risk-high"} hint="Runs that completed clean" />
        <Metric icon={Bot} label="Agent Utilization" value={`${a.agentUtilization}%`} tone="text-risk-low" hint="Share of the fleet engaged" />
        <Metric icon={ShieldCheck} label="Risk Reduction" value={`−${a.riskReduction}`} tone="text-risk-low" hint="Risk-score points removed" />
      </div>

      {/* Agent utilization breakdown */}
      <Card className="p-4">
        <SectionTitle title="Agent Utilization" subtitle="Automated actions by agent" action={<span className="text-xs text-slate-500">{a.agentBreakdown.length} agents</span>} />
        {a.agentBreakdown.length === 0 ? (
          <p className="text-sm text-slate-500">No agent activity yet.</p>
        ) : (
          <ul className="space-y-2.5">
            {a.agentBreakdown.map((r) => (
              <li key={r.agent}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-slate-200">
                    <Bot className="h-3.5 w-3.5 text-brand" /> {r.label}
                  </span>
                  <span className="text-slate-400">{r.actions} action{r.actions === 1 ? "" : "s"} · {r.share}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-bg-subtle">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${r.share}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Metric({ icon: Icon, label, value, tone, hint }: { icon: LucideIcon; label: string; value: string; tone?: string; hint: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</span>
        <Icon className="h-3.5 w-3.5 text-slate-400" />
      </div>
      <p className={cn("mt-1 text-2xl font-bold", tone)}>{value}</p>
      <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>
    </Card>
  );
}
