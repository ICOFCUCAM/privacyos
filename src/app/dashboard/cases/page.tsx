import Link from "next/link";
import { FolderKanban, Clock, ShieldAlert, Paperclip, ArrowUpRight, CheckCircle2, Circle } from "lucide-react";
import { Card, PageHeader, RiskBadge, SectionTitle } from "@/components/ui";
import { getDataSource } from "@/lib/data";
import {
  caseAgentActivity, caseQueue, filterCases, summarizeCases,
  WORKFLOW_STAGES, type CaseFilter, type SlaStatus,
} from "@/lib/intelligence/case-intel";
import { cn, timeAgo, titleCase } from "@/lib/ui";
import type { CaseStatus } from "@/lib/types";

export const metadata = { title: "Active Cases" };

const SLA_META: Record<SlaStatus, { label: string; cls: string }> = {
  on_track: { label: "On track", cls: "text-risk-low" },
  at_risk: { label: "At risk", cls: "text-risk-medium" },
  breached: { label: "SLA breached", cls: "text-risk-critical" },
  met: { label: "Met", cls: "text-slate-400" },
};

const STATUS_CLS: Record<CaseStatus, string> = {
  open: "text-brand-fg",
  in_progress: "text-risk-medium",
  awaiting_response: "text-risk-medium",
  escalated: "text-risk-high",
  resolved: "text-risk-low",
};

const FILTERS: { key: CaseFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "escalated", label: "Escalated" },
  { key: "resolved", label: "Resolved" },
  { key: "critical", label: "Critical" },
  { key: "high", label: "High" },
  { key: "medium", label: "Medium" },
  { key: "low", label: "Low" },
];

function ageLabel(hours: number): string {
  if (hours < 1) return "<1h";
  if (hours < 48) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

export default async function CasesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter: filterParam } = await searchParams;
  const active: CaseFilter = (FILTERS.some((f) => f.key === filterParam) ? filterParam : "all") as CaseFilter;

  const { cases, exposures } = await (await getDataSource()).getDataset();
  const summary = summarizeCases(cases, exposures);
  const queue = filterCases(caseQueue(cases, exposures), active);

  return (
    <div className="space-y-5">
      <PageHeader
        icon={FolderKanban}
        title="Case Management"
        subtitle="The operational center — every case tracked with severity, SLA, evidence, agent activity and an 8-stage workflow."
      />

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Kpi label="Open" value={String(summary.open)} />
        <Kpi label="Critical" value={String(summary.critical)} tone={summary.critical ? "text-risk-critical" : undefined} />
        <Kpi label="Resolved today" value={String(summary.resolvedToday)} tone="text-risk-low" />
        <Kpi label="Mean resolution" value={summary.mttrHours ? `${summary.mttrHours}h` : "—"} icon={<Clock className="h-3.5 w-3.5 text-slate-400" />} />
        <Kpi label="Escalated" value={String(summary.escalated)} tone={summary.escalated ? "text-risk-high" : undefined} />
        <Kpi label="SLA breached" value={String(summary.slaBreached)} tone={summary.slaBreached ? "text-risk-critical" : undefined} icon={<ShieldAlert className="h-3.5 w-3.5 text-slate-400" />} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/dashboard/cases" : `/dashboard/cases?filter=${f.key}`}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition",
              active === f.key ? "bg-brand text-white" : "border border-border text-slate-300 hover:bg-bg-elevated",
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {/* Case queue */}
      <Card className="p-4">
        <SectionTitle
          title="Case queue"
          subtitle={`${queue.length} shown · ${summary.open} open · ${cases.length} total`}
        />
        {queue.length === 0 ? (
          <p className="text-sm text-slate-500">
            {cases.length === 0
              ? "No cases yet — they open automatically when you approve a recommendation or an agent escalates a threat."
              : "No cases match this filter."}
          </p>
        ) : (
          <div className="space-y-2.5">
            {queue.map(({ case: c, sla, slaHours, ageHours, evidenceCount, timeline, workflowIndex }) => {
              const slaMeta = SLA_META[sla];
              const agents = caseAgentActivity(c);
              return (
                <details key={c.id} className="group rounded-xl border border-border bg-bg-subtle/40 p-3.5 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1.5">
                    <span className="font-mono text-[10px] text-slate-500">#{c.id.slice(0, 6)}</span>
                    <RiskBadge level={c.riskLevel} />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{c.title}</span>
                    <span className="rounded-md bg-bg-subtle px-1.5 py-0.5 text-[10px] font-medium text-slate-400 ring-1 ring-border">{titleCase(c.assignedAgent)}</span>
                    <span className={cn("text-[11px] font-semibold", STATUS_CLS[c.status])}>{titleCase(c.status)}</span>
                    <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold", slaMeta.cls)}><Clock className="h-3 w-3" />{slaMeta.label}</span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-500"><Paperclip className="h-3 w-3" />{evidenceCount}</span>
                    <span className="text-[11px] text-slate-500">{ageLabel(ageHours)}</span>
                  </summary>

                  {/* 8-stage workflow progress */}
                  <div className="mt-3 flex items-center gap-1 overflow-x-auto border-t border-border pt-3">
                    {WORKFLOW_STAGES.map((stage, i) => (
                      <div key={stage} className="flex flex-1 items-center gap-1">
                        <div className={cn(
                          "flex-1 rounded px-1.5 py-1 text-center text-[9px] font-semibold uppercase tracking-wide",
                          i < workflowIndex ? "bg-risk-low/15 text-risk-low"
                            : i === workflowIndex ? "bg-brand/20 text-brand-fg ring-1 ring-brand/40"
                              : "bg-bg-subtle text-slate-600",
                        )}>
                          {stage}
                        </div>
                        {i < WORKFLOW_STAGES.length - 1 && <span className="text-slate-700">›</span>}
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
                    {/* Overview + actions */}
                    <div className="space-y-3 lg:col-span-2">
                      <p className="text-sm text-slate-300">{c.summary || "No summary provided."}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                        <span>Type: <span className="text-slate-300">{titleCase(c.type)}</span></span>
                        <span>SLA target: <span className="text-slate-300">{slaHours}h</span></span>
                        <span>Opened: <span className="text-slate-300">{timeAgo(c.createdAt)}</span></span>
                      </div>

                      {/* Agent activity */}
                      <div>
                        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Agent activity</p>
                        <ul className="space-y-1">
                          {agents.map((a) => (
                            <li key={a.agent} className="flex items-center gap-2 text-xs">
                              <span className="rounded bg-brand/12 px-1.5 py-0.5 text-[10px] font-medium text-brand-fg ring-1 ring-brand/20">{titleCase(a.agent)}</span>
                              <span className="text-slate-400">{a.action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Evidence vault */}
                      <div>
                        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Evidence vault</p>
                        {evidenceCount > 0 ? (
                          <ul className="space-y-1">
                            {exposures.filter((e) => c.relatedExposureIds.includes(e.id)).map((e) => (
                              <li key={e.id} className="flex items-center gap-2 text-xs text-slate-400">
                                <Paperclip className="h-3 w-3 shrink-0 text-slate-500" />
                                <span className="truncate">{e.sourceName} — {e.snippet || titleCase(e.category)}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-slate-600">No linked evidence yet.</p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link href="/dashboard/workflows" className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand/90">Open workflow</Link>
                        <Link href="/dashboard/legal" className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-bg-elevated">Generate legal request</Link>
                        {c.status === "escalated" && (
                          <Link href="/dashboard/recommendations" className="inline-flex items-center gap-1 rounded-lg border border-risk-high/40 px-3 py-1.5 text-xs font-medium text-risk-high transition hover:bg-risk-high/10">
                            <ArrowUpRight className="h-3 w-3" /> Review escalation
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* Timeline */}
                    <div>
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Case timeline</p>
                      <ol className="space-y-1.5">
                        {timeline.map((step, i) => (
                          <li key={i} className="flex items-start gap-2">
                            {step.done
                              ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-risk-low" />
                              : <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-600" />}
                            <div>
                              <p className={cn("text-xs", step.done ? "text-slate-300" : "text-slate-500")}>{step.label}</p>
                              {step.done && <p className="text-[10px] text-slate-600">{timeAgo(step.at)}</p>}
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
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
      <p className={cn("mt-1 text-2xl font-bold text-white", tone)}>{value}</p>
    </Card>
  );
}
