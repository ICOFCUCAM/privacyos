"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/audit/audit";
import { isAdminEmail } from "@/lib/billing/entitlements";
import { buildSuiteSeedRows, SEED_TABLES, type SeedTable } from "@/lib/data/suite-seed";

export interface SettingsState {
  error?: string;
  message?: string;
}

function parseList(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Update the monitored identifiers for a subject. */
export async function updateSubject(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return { error: "Editing is available once connected to Supabase. In demo mode changes aren't persisted." };
  }

  const id = String(formData.get("id") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim();
  if (!id) return { error: "Missing subject." };
  if (!displayName) return { error: "A display name is required." };

  const { error } = await supabase
    .from("subjects")
    .update({
      type: String(formData.get("type") ?? "individual"),
      display_name: displayName,
      emails: parseList(formData.get("emails")),
      phones: parseList(formData.get("phones")),
      usernames: parseList(formData.get("usernames")),
      organization: String(formData.get("organization") ?? "").trim() || null,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  await recordAudit({ action: "subject.updated", entity: "subject", entityId: id, metadata: { name: displayName } });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  return { message: "Saved. Monitoring updated." };
}

const SUITE_PATHS = [
  "/dashboard/reputation", "/dashboard/family", "/dashboard/travel",
  "/dashboard/employees", "/dashboard/third-party",
];

/**
 * Seed the producer-less suite tables (family, travel, employees, credentials,
 * vendors, mentions, sentiment) with the sample dataset for the signed-in user,
 * so a fresh live account demonstrates the ReputationOS/BusinessOS/Family/Travel
 * surfaces. Admin-gated and idempotent: a table is only seeded if it's empty.
 */
export async function seedSuiteDataAction(): Promise<SettingsState> {
  const db = await getSupabaseServerClient();
  if (!db) return { error: "Live persistence requires Supabase. In demo mode the sample data is already shown." };

  const { data: { user } } = await db.auth.getUser();
  if (!user) return { error: "Sign in to seed live data." };
  if (!isAdminEmail(user.email)) return { error: "Seeding sample data is restricted to administrators." };

  const { data: subject } = await db.from("subjects").select("id").order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (!subject) return { error: "Create a monitored subject first (complete onboarding)." };

  const rows = buildSuiteSeedRows(user.id, subject.id);
  const seeded: SeedTable[] = [];
  const skipped: SeedTable[] = [];

  for (const table of SEED_TABLES) {
    const { count } = await db.from(table).select("id", { count: "exact", head: true });
    if ((count ?? 0) > 0) { skipped.push(table); continue; }
    const { error } = await db.from(table).insert(rows[table]);
    if (!error) seeded.push(table);
  }

  await recordAudit({ action: "suite.seeded", entity: "subject", entityId: subject.id, metadata: { seeded, skipped } });
  for (const p of SUITE_PATHS) revalidatePath(p);

  if (seeded.length === 0) {
    return { message: "All suite tables already have data — nothing to seed." };
  }
  return { message: `Seeded ${seeded.length} table(s): ${seeded.join(", ")}.${skipped.length ? ` Skipped ${skipped.length} already populated.` : ""}` };
}
