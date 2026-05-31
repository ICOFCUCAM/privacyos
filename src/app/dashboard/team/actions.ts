"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getMembership } from "@/lib/rbac/membership";
import { assignableRoles, can, type OrgRole } from "@/lib/rbac/roles";
import { recordAudit } from "@/lib/audit/audit";

async function liveDb() {
  const db = await getSupabaseServerClient();
  if (!db) return null;
  const { data: { user } } = await db.auth.getUser();
  return user ? db : null;
}

/** Invite a teammate by email with a role (owner/admin only). */
export async function inviteMemberAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "member") as OrgRole;
  if (!email) return;

  const membership = await getMembership();
  if (!membership || !can(membership.role, "manage_members")) return;
  if (!assignableRoles(membership.role).includes(role)) return;

  const db = await liveDb();
  if (!db) return; // demo — no-op
  await db.from("org_members").insert({
    org_id: membership.orgId,
    email,
    role,
    status: "invited",
  });
  await recordAudit({ action: "member.invited", entity: "org_member", metadata: { email, role } });
  revalidatePath("/dashboard/team");
}

/** Change a member's role (owner/admin only; can't elevate beyond own authority). */
export async function changeRoleAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "") as OrgRole;
  if (!id || !role) return;

  const membership = await getMembership();
  if (!membership || !can(membership.role, "manage_members")) return;
  if (!assignableRoles(membership.role).includes(role)) return;

  const db = await liveDb();
  if (!db) return;
  await db.from("org_members").update({ role }).eq("id", id).eq("org_id", membership.orgId);
  await recordAudit({ action: "member.role_changed", entity: "org_member", entityId: id, metadata: { role } });
  revalidatePath("/dashboard/team");
}

/** Remove a member (owner/admin only). */
export async function removeMemberAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const membership = await getMembership();
  if (!membership || !can(membership.role, "manage_members")) return;

  const db = await liveDb();
  if (!db) return;
  await db.from("org_members").delete().eq("id", id).eq("org_id", membership.orgId);
  await recordAudit({ action: "member.removed", entity: "org_member", entityId: id });
  revalidatePath("/dashboard/team");
}
