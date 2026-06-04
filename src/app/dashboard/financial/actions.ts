"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/** Opt into / out of automated credit checks. Default is manual (opted out). */
export async function setCreditAutoAction(formData: FormData): Promise<void> {
  const subjectId = String(formData.get("subjectId") ?? "");
  const auto = String(formData.get("auto") ?? "") === "true";
  if (subjectId) {
    const db = await getSupabaseServerClient();
    // RLS scopes the update to the signed-in user's own subject.
    if (db) await db.from("subjects").update({ credit_auto: auto }).eq("id", subjectId);
  }
  revalidatePath("/dashboard/financial");
}

/** Run a credit check now (manual pull) — records the pull so auto stays throttled. */
export async function runCreditCheckAction(formData: FormData): Promise<void> {
  const subjectId = String(formData.get("subjectId") ?? "");
  if (subjectId) {
    const db = await getSupabaseServerClient();
    if (db) await db.from("subjects").update({ credit_checked_at: new Date().toISOString() }).eq("id", subjectId);
  }
  revalidatePath("/dashboard/financial");
}
