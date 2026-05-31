import { describe, it, expect } from "vitest";
import { analyzeTeam } from "./team-posture";
import type { TeamMember } from "./membership";

const member = (over: Partial<TeamMember>): TeamMember => ({
  id: Math.random().toString(36).slice(2), email: "x@co.com", role: "member", status: "active", isSelf: false, ...over,
});

describe("analyzeTeam", () => {
  it("rewards a healthy least-privilege roster", () => {
    const p = analyzeTeam([
      member({ role: "owner" }),
      member({ role: "member" }),
      member({ role: "member" }),
      member({ role: "viewer" }),
    ]);
    expect(p.level).toBe("strong");
    expect(p.governanceScore).toBeGreaterThanOrEqual(80);
    expect(p.admins).toBe(1);
    expect(p.distribution.member).toBe(2);
  });

  it("flags too many privileged accounts", () => {
    const p = analyzeTeam([
      member({ role: "owner" }),
      member({ role: "admin" }),
      member({ role: "admin" }),
    ]);
    expect(p.adminRatio).toBeGreaterThan(0.5);
    expect(p.findings.some((f) => f.severity === "high" && /privileged/i.test(f.label))).toBe(true);
    expect(p.governanceScore).toBeLessThan(80);
  });

  it("flags a missing owner and stale invites", () => {
    const p = analyzeTeam([
      member({ role: "admin" }),
      member({ role: "member", status: "invited" }),
      member({ role: "member", status: "invited" }),
      member({ role: "viewer", status: "invited" }),
    ]);
    expect(p.pendingInvites).toBe(3);
    expect(p.findings.some((f) => /no owner/i.test(f.label))).toBe(true);
    expect(p.findings.some((f) => /stale/i.test(f.label))).toBe(true);
  });

  it("reports a clean bill with no issues", () => {
    const p = analyzeTeam([member({ role: "owner" }), member({ role: "viewer" })]);
    expect(p.findings.every((f) => f.severity === "info")).toBe(true);
  });
});
