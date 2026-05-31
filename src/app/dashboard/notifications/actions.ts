"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/audit/audit";

/** Mark all of the current user's notifications as read (RLS-scoped). */
export async function markAllReadAction(): Promise<void> {
  const db = await getSupabaseServerClient();
  if (!db) return; // demo mode — no-op
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return;

  await db.from("notifications").update({ read: true }).eq("read", false);
  await recordAudit({ action: "notifications.marked_read", entity: "notification" });
  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard");
}
