import { Workflow } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { listWorkflowDefinitions } from "@/lib/agents/workflow-store";
import { ALL_AGENT_KINDS } from "@/lib/billing/entitlements";
import { WorkflowBuilder } from "./builder";

export const metadata = { title: "Workflow Builder" };

export default async function WorkflowBuilderPage() {
  const definitions = await listWorkflowDefinitions();

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Workflow}
        title="Workflow Builder"
        subtitle="Author your own automations — compose a trigger and an ordered chain of agent actions, gates and reports, then enable it to run on matching events."
      />
      <WorkflowBuilder initial={definitions} agents={ALL_AGENT_KINDS} />
    </div>
  );
}
