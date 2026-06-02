"use server";

import { redirect } from "next/navigation";
import { recordAudit } from "@/lib/audit/audit";
import { findCollaboration, collaborationToDefinition } from "@/lib/agents/agent-collaboration";
import { saveWorkflowAction } from "../actions";

/** Lower a collaboration into a workflow, save it, and open the builder. */
export async function useCollaborationAction(formData: FormData): Promise<void> {
  const id = String(formData.get("collaborationId") ?? "");
  const c = findCollaboration(id);
  if (!c) return;

  await saveWorkflowAction(collaborationToDefinition(c));
  await recordAudit({
    action: "workflow.collaboration_used",
    entity: "workflow_definition",
    entityId: c.id,
    metadata: { name: c.name },
  });
  redirect("/dashboard/workflow-builder?from=generated");
}
