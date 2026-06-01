import Link from "next/link";
import {
  LayoutTemplate, Sparkles, ArrowRight, ArrowDownRight, Plus, Bot, GitFork, Bell, FileText,
  Filter, FolderKanban, Trash2, Webhook, Clock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, PageHeader, SectionTitle } from "@/components/ui";
import { cn, titleCase } from "@/lib/ui";
import {
  AUTOMATION_TEMPLATES, groupTemplates, templateAgents, templateStats,
  type WorkflowTemplate,
} from "@/lib/agents/automation-templates";
import { describeTrigger, type StepType } from "@/lib/agents/workflow-builder";
import { useTemplateAction } from "./actions";

export const metadata = { title: "Automation Templates" };

const STEP_ICON: Record<StepType, LucideIcon> = {
  agent: Bot, decision: GitFork, notify: Bell, report: FileText,
  condition: Filter, case: FolderKanban, takedown: Trash2, webhook: Webhook, wait: Clock,
};

export default function AutomationTemplatesPage() {
  const groups = groupTemplates();
  const stats = templateStats();

  return (
    <div className="space-y-5">
      <PageHeader
        icon={LayoutTemplate}
        title="Automation Templates"
        subtitle="Best-practice workflow packs, ready to run. Pick one to drop a fully-composed automation into the builder — review it, tweak it, enable it."
        actions={
          <Link
            href="/dashboard/workflow-builder"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg-elevated px-3 py-2 text-xs font-medium text-slate-300 hover:text-white"
          >
            <Plus className="h-3.5 w-3.5" /> Build from scratch
          </Link>
        }
      />

      {/* Catalog stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Templates" value={String(stats.total)} tone="text-white" />
        <Kpi label="Recommended" value={String(stats.recommended)} tone="text-brand-fg" />
        <Kpi label="Categories" value={String(stats.categories)} tone="text-white" />
        <Kpi label="Avg. risk reduction" value={`−${stats.avgImpact}`} tone="text-risk-low" />
      </div>

      {groups.map((g) => (
        <Card key={g.category} className="p-4">
          <SectionTitle title={g.category} subtitle={`${g.items.length} template${g.items.length === 1 ? "" : "s"}`} />
          <div className="grid gap-3 lg:grid-cols-2">
            {g.items.map((t) => <TemplateCard key={t.id} t={t} />)}
          </div>
        </Card>
      ))}

      <p className="px-1 text-center text-xs text-slate-600">
        {AUTOMATION_TEMPLATES.length} templates · each instantiates into an editable draft and runs on the same orchestrator the agent fleet uses.
      </p>
    </div>
  );
}

function TemplateCard({ t }: { t: WorkflowTemplate }) {
  const agents = templateAgents(t);
  return (
    <div className="flex flex-col rounded-xl border border-border bg-bg-subtle/40 p-3.5">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-white">{t.name}</h3>
        {t.recommended && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-brand/12 px-1.5 py-0.5 text-[10px] font-semibold text-brand-fg ring-1 ring-brand/25">
            <Sparkles className="h-3 w-3" /> Recommended
          </span>
        )}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-slate-400">{t.description}</p>

      <p className="mt-2.5 text-[11px] text-slate-500">
        Trigger: <span className="text-slate-400">{describeTrigger(t.trigger)}</span>
      </p>

      {/* Step chain */}
      <div className="mt-2 flex flex-wrap items-center gap-1">
        {t.steps.map((s, i) => {
          const Icon = STEP_ICON[s.type];
          return (
            <span key={i} className="inline-flex items-center gap-1">
              <span className="inline-flex items-center gap-1 rounded bg-bg-elevated px-1.5 py-0.5 text-[10px] font-medium text-slate-300 ring-1 ring-border">
                <Icon className="h-3 w-3 text-brand-fg" />
                {s.agent ? titleCase(s.agent) : titleCase(s.type)}
              </span>
              {i < t.steps.length - 1 && <ArrowRight className="h-3 w-3 text-slate-600" />}
            </span>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2.5">
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span>{agents.length} agent{agents.length === 1 ? "" : "s"} · {t.steps.length} steps</span>
          {t.impact > 0 && (
            <span className="inline-flex items-center gap-0.5 text-risk-low">
              <ArrowDownRight className="h-3 w-3" /> −{t.impact} risk
            </span>
          )}
        </div>
        <form action={useTemplateAction}>
          <input type="hidden" name="templateId" value={t.id} />
          <button
            type="submit"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
              "bg-brand text-white hover:bg-brand/90",
            )}
          >
            Use template <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </form>
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
