"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getDataSource } from "@/lib/data";
import { mapSubject } from "@/lib/data/mappers";
import { runDiscovery } from "@/lib/discovery/pipeline";
import { recordAudit } from "@/lib/audit/audit";

export interface OnboardingState {
  error?: string;
}

/** Split a textarea/comma-separated field into a clean string array. */
function parseList(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Creates the user's first protected subject and (optionally) kicks off an
 * initial discovery scan. Runs in the authenticated context, so RLS + the
 * `user_id default auth.uid()` column attribute scope the row to the user.
 */
export async function createSubject(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) redirect("/dashboard"); // demo mode — nothing to create

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const displayName = String(formData.get("displayName") ?? "").trim();
  if (!displayName) return { error: "A display name is required." };

  const type = String(formData.get("type") ?? "individual");
  const organization = String(formData.get("organization") ?? "").trim() || null;
  const runScan = formData.get("runScan") === "on";

  const { data: row, error } = await supabase
    .from("subjects")
    .insert({
      type,
      display_name: displayName,
      emails: parseList(formData.get("emails")),
      phones: parseList(formData.get("phones")),
      usernames: parseList(formData.get("usernames")),
      organization,
    })
    .select("*")
    .single();

  if (error) return { error: error.message };

  await recordAudit({ action: "subject.created", entity: "subject", entityId: row?.id, metadata: { name: displayName } });

  if (runScan && row) {
    // Best-effort first scan — never block onboarding on it.
    try {
      const ds = await getDataSource();
      const finding = await runDiscovery({ subject: mapSubject(row), existing: [] });
      if (finding.exposures.length || finding.threats.length) {
        await ds.persistDiscovery(finding);
      }
    } catch {
      /* ignore — the scheduled monitor will pick it up */
    }
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
