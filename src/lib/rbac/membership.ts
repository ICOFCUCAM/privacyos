/**
 * Org membership resolver.
 *
 * Live-aware like the rest of the data layer: reads the signed-in user's
 * org_members row(s). Demo/unauthenticated mode grants an OWNER membership with
 * a sample team so the product is fully explorable. Never throws.
 */

import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { MemberStatus, OrgRole } from "./roles";

export interface Membership {
  orgId: string;
  orgName: string;
  role: OrgRole;
  live: boolean;
}

export interface TeamMember {
  id: string;
  email: string;
  role: OrgRole;
  status: MemberStatus;
  isSelf: boolean;
}

const DEMO_TEAM: TeamMember[] = [
  { id: "m1", email: "jordan@vancecapital.com", role: "owner", status: "active", isSelf: true },
  { id: "m2", email: "m.chen@vancecapital.com", role: "admin", status: "active", isSelf: false },
  { id: "m3", email: "s.patel@vancecapital.com", role: "member", status: "active", isSelf: false },
  { id: "m4", email: "auditor@vancecapital.com", role: "viewer", status: "invited", isSelf: false },
];

export const DEMO_MEMBERSHIP: Membership = {
  orgId: "demo-org",
  orgName: "Vance Capital",
  role: "owner",
  live: false,
};

/** The current user's primary org membership, or demo membership. */
export async function getMembership(): Promise<Membership | null> {
  if (!isSupabaseConfigured()) return DEMO_MEMBERSHIP;
  try {
    const db = await getSupabaseServerClient();
    if (!db) return DEMO_MEMBERSHIP;
    const { data: { user } } = await db.auth.getUser();
    if (!user) return DEMO_MEMBERSHIP;

    // Claim any pending invites addressed to this user's email (idempotent).
    await db.rpc("accept_org_invites").then(undefined, () => {});

    const { data, error } = await db
      .from("org_members")
      .select("org_id,role,organizations(name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null; // signed in but not in any org
    const org = data.organizations as unknown as { name?: string } | null;
    return { orgId: data.org_id, orgName: org?.name ?? "Your organization", role: data.role, live: true };
  } catch {
    return null;
  }
}

/** Roster for an org. Demo returns a representative team. */
export async function listTeam(orgId: string): Promise<TeamMember[]> {
  if (!isSupabaseConfigured() || orgId === "demo-org") return DEMO_TEAM;
  try {
    const db = await getSupabaseServerClient();
    if (!db) return DEMO_TEAM;
    const { data: { user } } = await db.auth.getUser();
    const { data } = await db
      .from("org_members")
      .select("id,email,role,status,user_id")
      .eq("org_id", orgId)
      .order("created_at", { ascending: true });
    return (data ?? []).map((m) => ({
      id: m.id,
      email: m.email,
      role: m.role,
      status: m.status,
      isSelf: m.user_id === user?.id,
    }));
  } catch {
    return [];
  }
}
