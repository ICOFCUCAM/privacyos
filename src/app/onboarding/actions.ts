"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getDataSource } from "@/lib/data";
import { mapSubject } from "@/lib/data/mappers";
import { runDiscovery } from "@/lib/discovery/pipeline";
import { recordAudit } from "@/lib/audit/audit";
import { cookies } from "next/headers";
import { getEntitlements } from "@/lib/billing/subscription";
import { protectionsForEntitlements, PROVISIONED_COOKIE } from "@/lib/onboarding/auto-provision";
import { findListing, installListing } from "@/lib/agents/workflow-marketplace";
import { saveWorkflowAction } from "@/app/dashboard/workflow-builder/actions";
import { AUTONOMY_COOKIE, defaultModeForPlan } from "@/lib/home/autonomy";
import { INTENT_COOKIE } from "@/lib/home/scan-intent";

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
      photos: parseList(formData.get("photos")),
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

  // Auto-provision protection: install + enable the right packs for the plan so
  // monitoring starts automatically. Standard customers never touch the builder.
  try {
    const ent = await getEntitlements();
    const packs = protectionsForEntitlements(ent);
    const seen = new Set<string>();
    for (const id of packs) {
      const listing = findListing(id);
      if (!listing || seen.has(id)) continue;
      seen.add(id);
      for (const def of installListing(listing)) {
        await saveWorkflowAction({ ...def, enabled: true });
      }
    }
    const store = await cookies();
    if (seen.size > 0) {
      // Surface the provisioning outcome once on Protection Home.
      store.set(PROVISIONED_COOKIE, [...seen].join(","), { path: "/", maxAge: 60 * 60 * 24, sameSite: "lax" });
    }
    // Default the consent dial to a sensible mode for the plan so the customer
    // lands on already-running protection instead of another decision screen.
    const defaultMode = defaultModeForPlan(ent.planId ?? undefined);
    if (!store.get(AUTONOMY_COOKIE)) {
      store.set(AUTONOMY_COOKIE, defaultMode, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    }
    // Persist server-side so the background cycle honors it from day one.
    try { await (await getDataSource()).setAutonomyMode(defaultMode); } catch { /* best-effort */ }
  } catch {
    /* best-effort — never block onboarding on provisioning */
  }

  // The scan's job is done — clear the through-line cookie.
  (await cookies()).delete(INTENT_COOKIE);

  revalidatePath("/dashboard");
  // Land new users straight on activated protection — packs on, autonomy set.
  redirect("/dashboard/home");
}
