"use server";

import { redirect } from "next/navigation";
import { recordAudit } from "@/lib/audit/audit";
import { resolveProvider } from "@/lib/agents/llm/provider";
import {
  generateWorkflowWithAI, type GeneratedWorkflow,
} from "@/lib/agents/workflow-generator";
import type { WorkflowDefinition } from "@/lib/agents/workflow-builder";
import { saveWorkflowAction } from "../actions";

/** Generate a workflow from a plain-English prompt (AI when configured, rules otherwise). */
export async function generateWorkflowAction(prompt: string): Promise<GeneratedWorkflow> {
  const clean = prompt.trim().slice(0, 500);
  const provider = resolveProvider();
  const result = await generateWorkflowWithAI(clean, provider);
  await recordAudit({
    action: "workflow.generated",
    entity: "workflow_definition",
    metadata: { prompt: clean, source: result.source, persona: result.persona, threat: result.threat },
  });
  return result;
}

/** Save a generated definition into the user's workflows and open the builder. */
export async function saveGeneratedWorkflowAction(def: WorkflowDefinition): Promise<void> {
  await saveWorkflowAction(def);
  redirect("/dashboard/workflow-builder?from=generated");
}
