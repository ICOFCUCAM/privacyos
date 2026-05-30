"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/audit/audit";

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
