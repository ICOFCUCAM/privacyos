import Link from "next/link";
import { Sparkles, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { WorkflowGenerator } from "./generator";

export const metadata = { title: "AI Workflow Generator" };

export default function GenerateWorkflowPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        icon={Sparkles}
        title="AI Workflow Generator"
        subtitle="Describe what you want to protect in plain English — PrivacyOS composes the trigger, agent chain and actions into a ready-to-run workflow."
        actions={
          <Link
            href="/dashboard/workflow-builder"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg-elevated px-3 py-2 text-xs font-medium text-slate-300 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to builder
          </Link>
        }
      />
      <WorkflowGenerator />
    </div>
  );
}
