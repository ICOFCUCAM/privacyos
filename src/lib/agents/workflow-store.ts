/**
 * Workflow-definition store.
 *
 * Reads/writes user-authored workflow automations (the `workflow_definitions`
 * table) built in the Workflow Builder. Live-aware with a graceful demo
 * fallback: when Supabase is unconfigured or the user is unauthenticated, reads
 * return an empty list and writes are no-ops, so the builder still renders.
 * Never throws — persistence must not break the page.
 */

import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { WorkflowDefinition, WorkflowStepDef, WorkflowTrigger } from "./workflow-builder";

interface WorkflowRow {
  id: string;
  name: string;
  trigger: WorkflowTrigger;
  steps: WorkflowStepDef[];
  enabled: boolean;
}

function rowToDefinition(r: WorkflowRow): WorkflowDefinition {
  return {
    id: r.id,
    name: r.name,
    trigger: r.trigger ?? { kind: "manual" },
    steps: Array.isArray(r.steps) ? r.steps : [],
    enabled: !!r.enabled,
  };
}

/** All saved workflow definitions for the current user, newest first. */
export async function listWorkflowDefinitions(): Promise<WorkflowDefinition[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const db = await getSupabaseServerClient();
    if (!db) return [];
    const { data: { user } } = await db.auth.getUser();
    if (!user) return [];
    const { data, error } = await db
      .from("workflow_definitions")
      .select("id,name,trigger,steps,enabled")
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return (data as WorkflowRow[]).map(rowToDefinition);
  } catch {
    return [];
  }
}
