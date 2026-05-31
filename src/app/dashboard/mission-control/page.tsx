import Link from "next/link";
import {
  Radar, ShieldAlert, FolderKanban, GitBranch, Bot, Activity, Clock,
  ArrowRight, AlertTriangle, CheckCircle2, Gauge, Zap, ArrowUpRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, PageHeader, SectionTitle } from "@/components/ui";
import { getDataSource } from "@/lib/data";
import { exposureToFinding, runPlaybooks, threatToFinding } from "@/lib/agents/playbooks";
import { buildWorkflows, workflowMetrics } from "@/lib/agents/workflows";
import { caseQueue, summarizeCases } from "@/lib/intelligence/case-intel";
import { summarizeThreats } from "@/lib/intelligence/threat-intel";
import { listWorkflowDefinitions } from "@/lib/agents/workflow-store";
import {
  buildPriorityQueue, computePosture, countUnresolvedExposures,
  type ActionKind, type ActionUrgency, type PostureLevel,
} from "@/lib/intelligence/mission-control";
import { cn, titleCase } from "@/lib/ui";

export const metadata = { title: "Mission Control" };

const POSTURE: Record<PostureLevel, { ring: string; bg: string; text: string; dot: string; icon: LucideIcon }> = {
  operational: { ring: "ring-risk-low/30", bg: "bg-risk-low/10", text: "text-risk-low", dot: "bg-risk-low", icon: CheckCircle2 },
  elevated: { ring: "ring-risk-medium/30", bg: "bg-risk-medium/10", text: "text-risk-medium", dot: "bg-risk-medium", icon: Activity },
  critical: { ring: "ring-risk-high/30", bg: "bg-risk-high/10", text: "text-risk-high", dot: "bg-risk-high", icon: AlertTriangle },
};

const URGENCY: Record<ActionUrgency, string> = {
  critical: "text-risk-critical bg-risk-critical/10 ring-risk-critical/30",
  high: "text-risk-high bg-risk-high/10 ring-risk-high/30",
  medium: "text-risk-medium bg-risk-medium/10 ring-risk-medium/30",
};

const KIND_ICON: Record<ActionKind, LucideIcon> = {
  case: FolderKanban, workflow: GitBranch, threat: ShieldAlert,
};

export default async function MissionControlPage() {
  const ds = await getDataSource();
  const data = await ds.getDataset();

  const runs = runPlaybooks([
    ...data.exposures.map(exposureToFinding),
    ...data.threats.map(threatToFinding),
  ]);
  const workflows = buildWorkflows(runs);
  const wfMetrics = workflowMetrics(workflows);
  const caseSummary = summarizeCases(data.cases, data.exposures);
  const cases = caseQueue(data.cases, data.exposures);
  const threatSummary = summarizeThreats(data.threats);
  const definitions = await listWorkflowDefinitions();
  const enabledAutomations = definitions.filter((d) => d.enabled).length;
  const unresolvedExposures = countUnresolvedExposures(data.exposures.map((e) => e.status));

  const posture = computePosture({
    riskScore: data.riskScore.overall,
    agents: data.agents,
    workflows: wfMetrics,
    cases: caseSummary,
    threats: threatSummary,
    unresolvedExposures,
    enabledAutomations,
  });
  const queue = buildPriorityQueue(cases, workflows, data.threats);

  const P = POSTURE[posture.level];
  const PIcon = P.icon;

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Gauge}
        title="Mission Control"
        subtitle="The single operating picture — fleet, workflows, cases and threats in one command view, with the queue of what needs a human right now."
        actions={
          <span className={cn("inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ring-1", P.bg, P.text, P.ring)}>
            <span className={cn("h-2 w-2 rounded-full", P.dot)} />
            {titleCase(posture.level)}
          </span>
        }
      />

      {/* Posture banner */}
      <div className={cn("flex flex-wrap items-center gap-3 rounded-xl border border-border px-4 py-3 ring-1", P.bg, P.ring)}>
        <PIcon className={cn("h-5 w-5 shrink-0", P.text)} />
        <div className="min-w-0 flex-1">
          <p className={cn("text-sm font-semibold", P.text)}>{posture.headline}</p>
          <p className="mt-0.5 text-xs text-slate-400">{posture.drivers.join(" · ")}</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Bot className="h-3.5 w-3.5" />
          {posture.agentsActive}/{posture.agentsTotal} agents engaged
        </div>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Risk score" value={String(posture.riskScore)} tone={posture.riskScore >= 80 ? "text-risk-high" : posture.riskScore >= 55 ? "text-risk-medium" : "text-risk-low"} icon={Gauge} href="/dashboard" />
        <Metric label="Open cases" value={String(caseSummary.open)} sub={caseSummary.slaBreached > 0 ? `${caseSummary.slaBreached} SLA breached` : `${caseSummary.critical} critical`} tone="text-white" icon={FolderKanban} href="/dashboard/cases" />
        <Metric label="Active workflows" value={String(wfMetrics.active)} sub={wfMetrics.awaitingApproval > 0 ? `${wfMetrics.awaitingApproval} awaiting approval` : "fully autonomous"} tone="text-white" icon={GitBranch} href="/dashboard/workflows" />
        <Metric label="Active threats" value={String(threatSummary.active)} sub={`${threatSummary.bySeverity.critical} critical · ${threatSummary.bySeverity.high} high`} tone="text-white" icon={ShieldAlert} href="/dashboard/threats" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Priority action queue */}
        <Card className="p-4 lg:col-span-2">
          <SectionTitle
            title="Priority action queue"
            subtitle="Everything needing a human, ranked across cases, workflows and threats"
            action={<span className="text-xs text-slate-500">{queue.length} item{queue.length === 1 ? "" : "s"}</span>}
          />
          {queue.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-risk-low/30 bg-risk-low/10 px-3.5 py-3 text-sm text-risk-low">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Queue clear — the fleet is handling everything autonomously.
            </div>
          ) : (
            <ul className="space-y-2">
              {queue.map((a) => {
                const Icon = KIND_ICON[a.kind];
                return (
                  <li key={a.id}>
                    <Link href={a.href} className="flex items-center gap-3 rounded-xl border border-border bg-bg-subtle/40 p-3 transition hover:border-brand/30 hover:bg-bg-subtle/70">
                      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1", URGENCY[a.urgency])}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">{a.title}</p>
                        <p className="text-[11px] text-slate-500">{titleCase(a.kind)} · {a.detail}</p>
                      </div>
                      <span className={cn("shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1", URGENCY[a.urgency])}>
                        {a.urgency}
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-600" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Right rail: fleet + automation posture */}
        <div className="space-y-5">
          <Card className="p-4">
            <SectionTitle title="Fleet" action={<Link href="/dashboard/agents" className="text-xs font-medium text-brand-fg hover:underline">View</Link>} />
            <Stat icon={Bot} label="Agents engaged" value={`${posture.agentsActive}/${posture.agentsTotal}`} />
            <Stat icon={Activity} label="Items handled" value={posture.itemsHandled.toLocaleString()} />
            <Stat icon={Clock} label="Analyst-hours saved" value={String(wfMetrics.hoursSaved)} tone="text-risk-low" />
            <Stat icon={CheckCircle2} label="Workflows completed" value={String(wfMetrics.completedToday)} />
          </Card>

          <Card className="p-4">
            <SectionTitle title="Automation" action={<Link href="/dashboard/workflow-builder" className="text-xs font-medium text-brand-fg hover:underline">Build</Link>} />
            <Stat icon={Zap} label="Enabled automations" value={String(enabledAutomations)} tone={enabledAutomations > 0 ? "text-risk-low" : "text-slate-400"} />
            <Stat icon={Radar} label="Unresolved exposures" value={String(unresolvedExposures)} />
            <Stat icon={ArrowUpRight} label="Escalated workflows" value={String(wfMetrics.escalated)} tone={wfMetrics.escalated > 0 ? "text-risk-high" : "text-slate-400"} />
            <div className="mt-3 border-t border-border pt-3">
              <Link href="/dashboard/automation-templates" className="flex items-center justify-between text-xs font-medium text-slate-400 hover:text-white">
                Browse automation templates <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Metric({
  label, value, sub, tone, icon: Icon, href,
}: {
  label: string; value: string; sub?: string; tone?: string; icon: LucideIcon; href: string;
}) {
  return (
    <Link href={href}>
      <Card className="p-4 transition hover:border-brand/30">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</span>
          <Icon className="h-3.5 w-3.5 text-slate-500" />
        </div>
        <p className={cn("mt-1 text-2xl font-bold", tone)}>{value}</p>
        {sub && <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p>}
      </Card>
    </Link>
  );
}

function Stat({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="flex items-center gap-2 text-xs text-slate-400">
        <Icon className="h-3.5 w-3.5 text-slate-500" /> {label}
      </span>
      <span className={cn("text-sm font-semibold text-white", tone)}>{value}</span>
    </div>
  );
}
