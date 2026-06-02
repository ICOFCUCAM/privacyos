import Link from "next/link";
import { Workflow, CheckCircle2, LayoutTemplate, History, TrendingUp } from "lucide-react";
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
      <WorkflowBuilder initial={definitions} agents={ALL_AGENT_KINDS} />
    </div>
  );
}
