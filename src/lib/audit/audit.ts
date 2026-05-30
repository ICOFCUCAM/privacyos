/**
 * Audit logging.
 *
 * Records user/system actions to the append-only `audit_logs` table — a
 * compliance requirement for an enterprise privacy platform. `recordAudit` is a
 * best-effort, fire-and-forget write from authenticated server contexts (RLS +
 * `user_id default auth.uid()` scope the row); it silently no-ops in demo mode
 * so callers never need to branch. `getAuditLog` is live-aware with a demo
 * fallback, mirroring the rest of the data layer.
 */

import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { AuditLogEntry } from "@/lib/suite-types";

export interface AuditInput {
  action: string;
  actor?: string;
  entity?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    const db = await getSupabaseServerClient();
    if (!db) return;
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) return;
    await db.from("audit_logs").insert({
      actor: input.actor ?? "user",
      action: input.action,
      entity: input.entity ?? null,
      entity_id: input.entityId ?? null,
      metadata: input.metadata ?? {},
    });
  } catch {
    // Never let audit logging break the primary action.
  }
}

const iso = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString();

export function demoAuditLog(): AuditLogEntry[] {
  return [
    { id: "a1", actor: "user", action: "recommendation.approved", entity: "recommendation", metadata: { title: "Rotate exposed credentials now" }, createdAt: iso(8) },
    { id: "a2", actor: "user", action: "removal.filed", entity: "removal_request", metadata: { broker: "Spokeo" }, createdAt: iso(40) },
    { id: "a3", actor: "agent:privacy", action: "removal.rechecked", entity: "removal_request", metadata: { broker: "BeenVerified", result: "still removed" }, createdAt: iso(180) },
    { id: "a4", actor: "user", action: "threat.acknowledged", entity: "threat", metadata: { title: "Negative article gaining search visibility" }, createdAt: iso(300) },
    { id: "a5", actor: "agent:discovery", action: "discovery.scan", entity: "subject", metadata: { newExposures: 3, newThreats: 1 }, createdAt: iso(360) },
    { id: "a6", actor: "user", action: "subject.created", entity: "subject", metadata: { name: "Jordan Vance" }, createdAt: iso(60 * 24 * 120) },
  ];
}

export async function getAuditLog(limit = 100): Promise<AuditLogEntry[]> {
  if (!isSupabaseConfigured()) return demoAuditLog();
  const db = await getSupabaseServerClient();
  if (!db) return demoAuditLog();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return demoAuditLog();

  const { data } = await db
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((r) => ({
    id: r.id,
    actor: r.actor,
    action: r.action,
    entity: r.entity ?? undefined,
    entityId: r.entity_id ?? undefined,
    metadata: r.metadata ?? {},
    createdAt: r.created_at,
  }));
}

/** Human-readable label for an audit action key (e.g. "removal.filed"). */
export function describeAudit(entry: AuditLogEntry): string {
  const map: Record<string, string> = {
    "recommendation.approved": "Approved AI recommendation",
    "threat.acknowledged": "Acknowledged threat",
    "removal.filed": "Filed data-broker opt-out",
    "removal.rechecked": "Ran removal re-check",
    "subject.created": "Created protected subject",
    "discovery.scan": "Ran discovery scan",
  };
  return map[entry.action] ?? entry.action.replace(/[._]/g, " ");
}
