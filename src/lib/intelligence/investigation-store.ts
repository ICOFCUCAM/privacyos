/**
 * Threat-investigation store.
 *
 * Reads the real, timestamped investigation steps persisted per threat (the
 * `threat_investigations` table). Live-aware with a deterministic fallback: when
 * a threat has no stored steps yet (or in demo mode), the caller derives the
 * timeline from the threat's kind + severity instead. Never throws — investigation
 * data must not break the threat page.
 */

import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export interface InvestigationStep {
  threatId: string;
  agent: string;
  label: string;
  at: string;
}

/** Map raw rows to steps, grouped by threat id. */
export function groupInvestigationRows(rows: { threat_id: string; agent: string; label: string; created_at: string }[]): Map<string, InvestigationStep[]> {
  const map = new Map<string, InvestigationStep[]>();
  for (const r of rows) {
    const list = map.get(r.threat_id) ?? [];
    list.push({ threatId: r.threat_id, agent: r.agent, label: r.label, at: r.created_at });
    map.set(r.threat_id, list);
  }
  for (const list of map.values()) list.sort((a, b) => a.at.localeCompare(b.at));
  return map;
}

/**
 * Fetch stored investigation steps for the current user's threats, keyed by
 * threat id. Returns an empty map in demo mode / when unauthenticated / on any
 * error — the page then falls back to the derived timeline.
 */
export async function getThreatInvestigations(): Promise<Map<string, InvestigationStep[]>> {
  if (!isSupabaseConfigured()) return new Map();
  try {
    const db = await getSupabaseServerClient();
    if (!db) return new Map();
    const { data: { user } } = await db.auth.getUser();
    if (!user) return new Map();
    const { data, error } = await db
      .from("threat_investigations")
      .select("threat_id,agent,label,created_at")
      .order("created_at", { ascending: true });
    if (error || !data) return new Map();
    return groupInvestigationRows(data);
  } catch {
    return new Map();
  }
}
