/**
 * Workflow-history store.
 *
 * Reads the stored workflow executions (the `workflow_runs` table) that back
 * the History view. Live-aware with a graceful demo fallback: when Supabase is
 * unconfigured or the user is unauthenticated — or the table is empty — it
 * returns the deterministic demo history so the page always renders. Never
 * throws; the history surface must not break on a persistence hiccup.
 */

import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  demoWorkflowHistory, toHistoryEntry, type HistoryEntry,
} from "./workflow-history";
import type { WorkflowRun } from "./workflow-builder";

interface WorkflowRunRow {
  /** Numeric reference shown as "#<seq>". */
  seq: number;
  run: WorkflowRun;
}

/** All stored executions for the current user, newest first; demo fallback. */
export async function listWorkflowHistory(): Promise<HistoryEntry[]> {
  if (!isSupabaseConfigured()) return demoWorkflowHistory();
  try {
    const db = await getSupabaseServerClient();
    if (!db) return demoWorkflowHistory();
    const { data: { user } } = await db.auth.getUser();
    if (!user) return demoWorkflowHistory();
    const { data, error } = await db
      .from("workflow_runs")
      .select("seq,run")
      .order("seq", { ascending: false });
    if (error || !data || data.length === 0) return demoWorkflowHistory();
    return (data as WorkflowRunRow[]).map((r) => toHistoryEntry(r.run, r.seq));
  } catch {
    return demoWorkflowHistory();
  }
}
