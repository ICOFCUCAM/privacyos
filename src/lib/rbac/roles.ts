/**
 * Organization RBAC roles & permissions.
 *
 * Pure, dependency-free role model shared by the membership resolver, the team
 * UI and server-action gating. Hierarchy: owner > admin > member > viewer.
 * Unit-tested so authorization decisions are explainable and never depend on IO.
 */

export type OrgRole = "owner" | "admin" | "member" | "viewer";
export type MemberStatus = "invited" | "active";

const RANK: Record<OrgRole, number> = { viewer: 0, member: 1, admin: 2, owner: 3 };

export type Permission =
  | "view"
  | "edit"
  | "manage_members"
  | "manage_billing"
  | "delete_org";

/** Minimum role required for each permission. */
const MIN_ROLE: Record<Permission, OrgRole> = {
  view: "viewer",
  edit: "member",
  manage_members: "admin",
  manage_billing: "admin",
  delete_org: "owner",
};

export function hasAtLeast(role: OrgRole, min: OrgRole): boolean {
  return RANK[role] >= RANK[min];
}

export function can(role: OrgRole, permission: Permission): boolean {
  return hasAtLeast(role, MIN_ROLE[permission]);
}

/**
 * Roles an actor may assign to others. Admins can manage member/viewer/admin
 * but never grant or revoke ownership; only an owner can assign any role.
 */
export function assignableRoles(actor: OrgRole): OrgRole[] {
  if (actor === "owner") return ["owner", "admin", "member", "viewer"];
  if (actor === "admin") return ["admin", "member", "viewer"];
  return [];
}

/** Whether `actor` may change/remove a member currently holding `target` role. */
export function canManageMember(actor: OrgRole, target: OrgRole): boolean {
  if (!can(actor, "manage_members")) return false;
  // Owners can manage anyone; admins cannot manage owners (or other admins' ownership).
  if (actor === "owner") return true;
  return target !== "owner";
}

export const ROLE_LABEL: Record<OrgRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};
