import Link from "next/link";
import { Network, ArrowLeft } from "lucide-react";
import { Card, PageHeader } from "@/components/ui";
import { collaborationStats } from "@/lib/agents/agent-collaboration";
import { cn } from "@/lib/ui";
import { CollaborationExplorer } from "./collaboration";

export const metadata = { title: "Agent Collaboration" };

export default function CollaborationPage() {
  const stats = collaborationStats();

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Network}
        title="Agent Collaboration Engine"
        subtitle="Most platforms automate actions. PrivacyOS automates agents — specialists that hand off to each other, each building on the shared context, until the case is owned end to end."
        actions={
          <Link
            href="/dashboard/workflow-builder"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg-elevated px-3 py-2 text-xs font-medium text-slate-300 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to builder
          </Link>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        <Kpi label="Collaborations" value={String(stats.scenarios)} tone="text-white" />
        <Kpi label="Agents / scenario" value={`up to ${stats.maxAgents}`} tone="text-brand-fg" />
        <Kpi label="Agents involved" value={String(stats.agentsInvolved)} tone="text-risk-low" />
      </div>

      <CollaborationExplorer />
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Card className="p-4">
      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</span>
      <p className={cn("mt-1 text-xl font-bold sm:text-2xl", tone)}>{value}</p>
    </Card>
  );
}
