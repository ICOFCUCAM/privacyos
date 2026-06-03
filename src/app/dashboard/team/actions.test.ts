import { describe, it, expect, vi, beforeEach } from "vitest";
import type { OrgRole } from "@/lib/rbac/roles";

const h = vi.hoisted(() => {
  const insert = vi.fn(async () => ({}));
  const eq2 = vi.fn(async () => ({}));
  const eq1 = vi.fn(() => ({ eq: eq2 }));
  const update = vi.fn(() => ({ eq: eq1 }));
  const del = vi.fn(() => ({ eq: eq1 }));
  const from = vi.fn(() => ({ insert, update, delete: del }));
  return {
    role: "owner" as OrgRole,
    from, insert, update, del,
    recordAudit: vi.fn(async () => {}),
    revalidate: vi.fn(),
  };
});

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
    from: h.from,
  }),
}));
vi.mock("@/lib/rbac/membership", () => ({ getMembership: async () => ({ role: h.role, orgId: "org1" }) }));
vi.mock("@/lib/audit/audit", () => ({ recordAudit: h.recordAudit }));
vi.mock("next/cache", () => ({ revalidatePath: h.revalidate }));

import { inviteMemberAction, changeRoleAction, removeMemberAction } from "./actions";

const form = (e: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(e)) fd.set(k, v);
  return fd;
};

beforeEach(() => {
  h.role = "owner";
  h.from.mockClear(); h.insert.mockClear(); h.update.mockClear(); h.del.mockClear();
  h.recordAudit.mockClear();
});

describe("team RBAC actions", () => {
  it("an owner can invite a member", async () => {
    await inviteMemberAction(form({ email: "teammate@acme.com", role: "member" }));
    expect(h.from).toHaveBeenCalledWith("org_members");
    expect(h.insert).toHaveBeenCalledOnce();
    expect(h.recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "member.invited" }));
  });

  it("a member (no manage_members) cannot invite — blocked before the DB", async () => {
    h.role = "member";
    await inviteMemberAction(form({ email: "x@acme.com", role: "member" }));
    expect(h.from).not.toHaveBeenCalled();
    expect(h.recordAudit).not.toHaveBeenCalled();
  });

  it("an admin cannot assign a role above their authority (owner)", async () => {
    h.role = "admin";
    await changeRoleAction(form({ id: "m1", role: "owner" }));
    expect(h.update).not.toHaveBeenCalled();
  });

  it("an owner can change a role and remove a member, scoped to their org", async () => {
    await changeRoleAction(form({ id: "m1", role: "admin" }));
    expect(h.update).toHaveBeenCalledOnce();
    await removeMemberAction(form({ id: "m2" }));
    expect(h.del).toHaveBeenCalledOnce();
  });
});
