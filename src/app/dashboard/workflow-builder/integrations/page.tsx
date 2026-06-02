import Link from "next/link";
import {
  Plug, ArrowLeft, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, Bot, CheckCircle2, ExternalLink,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, PageHeader, SectionTitle } from "@/components/ui";
import {
  WORKFLOW_INTEGRATIONS, integrationCoverage, agentRoster,
  type IntegrationDirection, type WorkflowIntegration,
} from "@/lib/agents/workflow-integrations";
import { ACTION_CATALOG, TRIGGER_CATALOG } from "@/lib/agents/workflow-builder";
import { cn } from "@/lib/ui";

export const metadata = { title: "Workflow Integrations" };

const ACTION_LABEL = new Map(ACTION_CATALOG.map((a) => [a.id, a.label]));

const DIRECTION_META: Record<IntegrationDirection, { label: string; icon: LucideIcon; cls: string }> = {
  inbound: { label: "Inbound", icon: ArrowDownToLine, cls: "text-risk-medium ring-risk-medium/30 bg-risk-medium/10" },
  outbound: { label: "Outbound", icon: ArrowUpFromLine, cls: "text-brand-fg ring-brand/30 bg-brand/10" },
  bidirectional: { label: "Bidirectional", icon: ArrowLeftRight, cls: "text-risk-low ring-risk-low/30 bg-risk-low/10" },
};

export default function IntegrationsPage() {
  const coverage = integrationCoverage();
  const roster = agentRoster();

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Plug}
        title="Workflow Integrations"
        subtitle="Enterprise wiring — the Workflow Builder is connected to every subsystem. Each trigger is fed by a real source and every action writes back into one."
        actions={
          <Link
            href="/dashboard/workflow-builder"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg-elevated px-3 py-2 text-xs font-medium text-slate-300 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to builder
          </Link>
        }
      />

      {/* Coverage strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Subsystems" value={String(coverage.integrations)} tone="text-white" />
        <Kpi label="Triggers wired" value={String(coverage.triggersCovered.length)} tone="text-white" />
        <Kpi label="Actions wired" value={String(coverage.actionsUsed.length)} tone="text-white" />
        <Kpi label="Agents" value={`${roster.length}`} tone="text-risk-low" />
      </div>

      {coverage.allValid && (
        <div className="flex items-center gap-2 rounded-xl border border-risk-low/30 bg-risk-low/10 px-3.5 py-2.5 text-sm text-risk-low">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          All {coverage.integrations} subsystem integrations verified — every wire resolves to a real trigger, action and agent.
        </div>
      )}

      {/* Integration cards */}
      <div className="grid gap-3 lg:grid-cols-2">
        {WORKFLOW_INTEGRATIONS.map((i) => <IntegrationCard key={i.id} i={i} />)}
      </div>

      {/* All 13 agents */}
      <Card className="p-4">
        <SectionTitle title="All 13 agents" subtitle="Every agent is an available workflow block" action={<span className="text-xs text-slate-500">{roster.length} agents</span>} />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {roster.map((r) => (
            <div key={r.agent} className="flex items-start gap-2 rounded-lg border border-border bg-bg-subtle/40 p-2.5">
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-brand/15 text-brand"><Bot className="h-3.5 w-3.5" /></span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white">{r.label}</p>
                <p className="truncate text-[10px] text-slate-500">{r.serves.length ? r.serves.join(" · ") : "Cross-cutting"}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function IntegrationCard({ i }: { i: WorkflowIntegration }) {
  const dir = DIRECTION_META[i.direction];
  const DirIcon = dir.icon;
  return (
    <div className="flex flex-col rounded-xl border border-border bg-bg-subtle/40 p-3.5">
      <div className="flex items-start justify-between gap-2">
        <Link href={i.route} className="group inline-flex items-center gap-1.5 text-sm font-semibold text-white hover:text-brand-fg">
          {i.name} <ExternalLink className="h-3 w-3 opacity-0 transition group-hover:opacity-100" />
        </Link>
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1", dir.cls)}>
          <DirIcon className="h-3 w-3" /> {dir.label}
        </span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-slate-400">{i.summary}</p>

      {i.triggers.length > 0 && (
        <Wires label="Triggers in" items={i.triggers.map((t) => TRIGGER_CATALOG[t].label)} tone="text-risk-medium" />
      )}
      {i.actions.length > 0 && (
        <Wires label="Actions out" items={i.actions.map((a) => ACTION_LABEL.get(a) ?? a)} tone="text-brand-fg" />
      )}
    </div>
  );
}

function Wires({ label, items, tone }: { label: string; items: string[]; tone: string }) {
  return (
    <div className="mt-2.5">
      <p className={cn("mb-1 text-[9px] font-semibold uppercase tracking-wide", tone)}>{label}</p>
      <div className="flex flex-wrap gap-1">
        {items.map((it) => (
          <span key={it} className="rounded bg-bg-elevated px-1.5 py-0.5 text-[10px] font-medium text-slate-300 ring-1 ring-border">{it}</span>
        ))}
      </div>
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
