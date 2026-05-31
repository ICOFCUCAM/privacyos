"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/audit/audit";
import { validateWorkflow, type WorkflowDefinition } from "@/lib/agents/workflow-builder";

async function liveDb() {
  const db = await getSupabaseServerClient();
  if (!db) return null;
  const { data: { user } } = await db.auth.getUser();
  return user ? db : null;
}

/** Persist a workflow definition (insert when id is "draft"/empty, else update). */
export async function saveWorkflowAction(def: WorkflowDefinition): Promise<void> {
  const { valid } = validateWorkflow(def);
  if (!valid) return; // client blocks save too; guard the server path as well

  const db = await liveDb();
  if (!db) return; // demo — no-op

  const payload = {
    name: def.name.trim(),
    trigger: def.trigger,
    steps: def.steps,
    enabled: def.enabled,
    updated_at: new Date().toISOString(),
  };

  const isNew = !def.id || def.id === "draft";
  if (isNew) {
    await db.from("workflow_definitions").insert(payload);
    await recordAudit({ action: "workflow.created", entity: "workflow_definition", metadata: { name: payload.name } });
  } else {
    await db.from("workflow_definitions").update(payload).eq("id", def.id);
    await recordAudit({ action: "workflow.updated", entity: "workflow_definition", entityId: def.id });
  }
  revalidatePath("/dashboard/workflow-builder");
}

/** Enable / disable a saved workflow. */
export async function toggleWorkflowAction(id: string, enabled: boolean): Promise<void> {
  if (!id) return;
  const db = await liveDb();
  if (!db) return;
  await db.from("workflow_definitions").update({ enabled, updated_at: new Date().toISOString() }).eq("id", id);
  await recordAudit({ action: enabled ? "workflow.enabled" : "workflow.disabled", entity: "workflow_definition", entityId: id });
  revalidatePath("/dashboard/workflow-builder");
}

/** Delete a saved workflow. */
export async function deleteWorkflowAction(id: string): Promise<void> {
  if (!id) return;
  const db = await liveDb();
  if (!db) return;
  await db.from("workflow_definitions").delete().eq("id", id);
  await recordAudit({ action: "workflow.deleted", entity: "workflow_definition", entityId: id });
  revalidatePath("/dashboard/workflow-builder");
}
