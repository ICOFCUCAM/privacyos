import Link from "next/link";
import { Workflow, CheckCircle2, LayoutTemplate, History, TrendingUp, Store, Sparkles, Network, Plug } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { listWorkflowDefinitions } from "@/lib/agents/workflow-store";
import { ALL_AGENT_KINDS } from "@/lib/billing/entitlements";
import { WorkflowBuilder } from "./builder";

export const metadata = { title: "Workflow Builder" };

export default async function WorkflowBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const [definitions, params] = await Promise.all([listWorkflowDefinitions(), searchParams]);

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Workflow}
        title="Workflow Builder"
        subtitle="Author your own automations — compose a trigger and an ordered chain of agent actions, gates and reports, then enable it to run on matching events."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/workflow-builder/generate"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white hover:bg-brand/90"
            >
              <Sparkles className="h-3.5 w-3.5" /> Generate with AI
            </Link>
            <Link
              href="/dashboard/workflow-builder/collaboration"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg-elevated px-3 py-2 text-xs font-medium text-slate-300 hover:text-white"
            >
              <Network className="h-3.5 w-3.5" /> Collaboration
            </Link>
            <Link
              href="/dashboard/workflow-builder/integrations"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg-elevated px-3 py-2 text-xs font-medium text-slate-300 hover:text-white"
            >
              <Plug className="h-3.5 w-3.5" /> Integrations
            </Link>
            <Link
              href="/dashboard/workflow-builder/marketplace"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg-elevated px-3 py-2 text-xs font-medium text-slate-300 hover:text-white"
            >
              <Store className="h-3.5 w-3.5" /> Marketplace
            </Link>
            <Link
              href="/dashboard/workflow-builder/analytics"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg-elevated px-3 py-2 text-xs font-medium text-slate-300 hover:text-white"
            >
              <TrendingUp className="h-3.5 w-3.5" /> Analytics
            </Link>
            <Link
              href="/dashboard/workflow-builder/history"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg-elevated px-3 py-2 text-xs font-medium text-slate-300 hover:text-white"
            >
              <History className="h-3.5 w-3.5" /> History
            </Link>
            <Link
              href="/dashboard/automation-templates"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg-elevated px-3 py-2 text-xs font-medium text-slate-300 hover:text-white"
            >
              <LayoutTemplate className="h-3.5 w-3.5" /> Start from a template
            </Link>
          </div>
        }
      />
      {params.from === "template" && (
        <div className="flex items-center gap-2 rounded-xl border border-risk-low/30 bg-risk-low/10 px-3.5 py-2.5 text-sm text-risk-low">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Template added to your saved workflows below — review the steps, then enable it.
        </div>
      )}
      {params.from === "marketplace" && (
        <div className="flex items-center gap-2 rounded-xl border border-risk-low/30 bg-risk-low/10 px-3.5 py-2.5 text-sm text-risk-low">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Workflow pack installed — the workflows are in your saved list below. Review the steps, then enable them.
        </div>
      )}
      {params.from === "generated" && (
        <div className="flex items-center gap-2 rounded-xl border border-risk-low/30 bg-risk-low/10 px-3.5 py-2.5 text-sm text-risk-low">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          AI-generated workflow saved below — review the composed steps, then enable it.
        </div>
      )}
      <WorkflowBuilder initial={definitions} agents={ALL_AGENT_KINDS} />
    </div>
  );
}
