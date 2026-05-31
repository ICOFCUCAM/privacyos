import { describe, expect, it } from "vitest";
import { assignableRoles, can, canManageMember, hasAtLeast } from "./roles";

describe("rbac roles", () => {
  it("respects the role hierarchy", () => {
    expect(hasAtLeast("owner", "admin")).toBe(true);
    expect(hasAtLeast("member", "admin")).toBe(false);
    expect(hasAtLeast("viewer", "viewer")).toBe(true);
  });

  it("gates permissions by minimum role", () => {
    expect(can("viewer", "view")).toBe(true);
    expect(can("viewer", "edit")).toBe(false);
    expect(can("member", "edit")).toBe(true);
    expect(can("member", "manage_members")).toBe(false);
    expect(can("admin", "manage_members")).toBe(true);
    expect(can("admin", "delete_org")).toBe(false);
    expect(can("owner", "delete_org")).toBe(true);
  });

  it("limits assignable roles by actor", () => {
    expect(assignableRoles("owner")).toContain("owner");
    expect(assignableRoles("admin")).not.toContain("owner");
    expect(assignableRoles("member")).toEqual([]);
  });

  it("prevents admins from managing owners", () => {
    expect(canManageMember("owner", "owner")).toBe(true);
    expect(canManageMember("admin", "member")).toBe(true);
    expect(canManageMember("admin", "owner")).toBe(false);
    expect(canManageMember("member", "viewer")).toBe(false);
  });
});
