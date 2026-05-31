/**
 * Team access-governance posture.
 *
 * Analyzes the org roster for least-privilege hygiene: admin concentration,
 * stale pending invites, and role distribution — producing a governance score
 * and explainable findings the team page surfaces. Pure and unit-tested; derived
 * from the roster alone so it works in live and demo modes.
 */

import type { OrgRole } from "./roles";
import type { TeamMember } from "./membership";

export type GovernanceLevel = "strong" | "review" | "at_risk";

export interface GovernanceFinding {
  severity: "high" | "medium" | "info";
  label: string;
  detail: string;
}

export interface TeamPosture {
  governanceScore: number;
  level: GovernanceLevel;
  activeMembers: number;
  pendingInvites: number;
  admins: number;
  /** Share of privileged (owner/admin) accounts among active members, 0–1. */
  adminRatio: number;
  distribution: Record<OrgRole, number>;
  findings: GovernanceFinding[];
}

const PRIVILEGED: OrgRole[] = ["owner", "admin"];

export function analyzeTeam(members: TeamMember[]): TeamPosture {
  const active = members.filter((m) => m.status === "active");
  const pending = members.filter((m) => m.status === "invited");
  const distribution: Record<OrgRole, number> = { owner: 0, admin: 0, member: 0, viewer: 0 };
  for (const m of members) distribution[m.role] += 1;

  const admins = active.filter((m) => PRIVILEGED.includes(m.role)).length;
  const adminRatio = active.length === 0 ? 0 : admins / active.length;

  let score = 100;
  const findings: GovernanceFinding[] = [];

  // Admin concentration — least privilege wants a minority of privileged accounts.
  if (active.length >= 2 && adminRatio > 0.5) {
    score -= 30;
    findings.push({
      severity: "high",
      label: "Too many privileged accounts",
      detail: `${admins} of ${active.length} active members are owner/admin. Apply least privilege — most users only need Member or Viewer.`,
    });
  } else if (active.length >= 4 && adminRatio > 0.4) {
    score -= 12;
    findings.push({
      severity: "medium",
      label: "Privileged-access creep",
      detail: `${Math.round(adminRatio * 100)}% of members hold admin rights. Review whether all need it.`,
    });
  }

  // Single owner / no owner.
  if (distribution.owner === 0) {
    score -= 20;
    findings.push({ severity: "high", label: "No owner", detail: "The org has no owner — assign one to retain full control." });
  }

  // Stale pending invites.
  if (pending.length >= 3) {
    score -= 12;
    findings.push({
      severity: "medium",
      label: "Stale invitations",
      detail: `${pending.length} invitations are still pending. Revoke any that are no longer needed.`,
    });
  } else if (pending.length > 0) {
    findings.push({
      severity: "info",
      label: "Pending invitations",
      detail: `${pending.length} invitation${pending.length === 1 ? "" : "s"} awaiting acceptance.`,
    });
  }

  // Read-only oversight is a good signal.
  if (distribution.viewer === 0 && active.length >= 3) {
    score -= 6;
    findings.push({
      severity: "info",
      label: "No read-only oversight",
      detail: "Consider a Viewer role for auditors or compliance — read-only access without edit rights.",
    });
  }

  if (findings.length === 0) {
    findings.push({ severity: "info", label: "Least privilege upheld", detail: "Role distribution looks healthy — no governance issues detected." });
  }

  const governanceScore = Math.max(0, Math.min(100, score));
  const level: GovernanceLevel = governanceScore >= 80 ? "strong" : governanceScore >= 55 ? "review" : "at_risk";

  return {
    governanceScore,
    level,
    activeMembers: active.length,
    pendingInvites: pending.length,
    admins,
    adminRatio,
    distribution,
    findings,
  };
}
