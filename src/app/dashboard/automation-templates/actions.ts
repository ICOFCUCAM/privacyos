"use server";

import { redirect } from "next/navigation";
import { findTemplate, templateToDefinition } from "@/lib/agents/automation-templates";
import { saveWorkflowAction } from "../workflow-builder/actions";

/**
 * Instantiate a catalog template into the user's own workflow definitions, then
 * drop them into the builder where it's ready to review, edit and enable.
 */
export async function useTemplateAction(formData: FormData): Promise<void> {
  const templateId = String(formData.get("templateId") ?? "");
  const template = findTemplate(templateId);
  if (!template) return;

  await saveWorkflowAction(templateToDefinition(template));
  redirect("/dashboard/workflow-builder?from=template");
}
