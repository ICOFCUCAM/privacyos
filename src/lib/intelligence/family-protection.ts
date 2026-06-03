/**
 * Family Protection intelligence.
 *
 * Turns the family roster into per-member protection assessments: each relative
 * gets safeguards tuned to who they are — minors need school/photo/location
 * lockdown, elderly relatives need scam/fraud watch — plus a family-wide
 * protection posture and a prioritized safeguard plan. Pure and unit-tested.
 */

import type { RiskLevel } from "@/lib/types";
import type { FamilyMember } from "@/lib/suite-types";

const RISK_RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };
const RISK_WEIGHT: Record<RiskLevel, number> = { low: 0, medium: 18, high: 30, critical: 44 };

export type MemberCategory = "minor" | "elder" | "adult";
export type MemberStatus = "protected" | "monitoring" | "action_required" | "critical";
export type FamilyPosture = "secure" | "elevated" | "critical";

export interface Safeguard {
  task: string;
  priority: "critical" | "high" | "standard";
}

export interface MemberAssessment {
  member: FamilyMember;
  category: MemberCategory;
  /** 0–100, higher = better protected. */
  protectionScore: number;
  status: MemberStatus;
  safeguards: Safeguard[];
}

const ELDER_HINTS = ["parent", "grandparent", "grandmother", "grandfather", "mother", "father"];

export function categorize(m: FamilyMember): MemberCategory {
  if (m.isMinor) return "minor";
  if (ELDER_HINTS.some((h) => m.relation.toLowerCase().includes(h))) return "elder";
  return "adult";
}

function statusFor(m: FamilyMember): MemberStatus {
  if (m.riskLevel === "critical") return "critical";
  if (m.riskLevel === "high") return "action_required";
  if (m.riskLevel === "medium" || m.exposuresCount > 0) return "monitoring";
  return "protected";
}

const CATEGORY_SAFEGUARDS: Record<MemberCategory, Safeguard[]> = {
  minor: [
    { task: "Remove from people-search & school directories", priority: "critical" },
    { task: "Lock down social photo tagging & facial recognition", priority: "high" },
    { task: "Enable location-sharing limits on devices", priority: "high" },
  ],
  elder: [
    { task: "Enable scam & fraud monitoring", priority: "high" },
    { task: "File data-broker opt-outs", priority: "high" },
    { task: "Watch for identity-theft signals", priority: "standard" },
  ],
  adult: [
    { task: "File data-broker opt-outs", priority: "high" },
    { task: "Enable credential & breach monitoring", priority: "standard" },
  ],
};

export function assessMember(m: FamilyMember): MemberAssessment {
  const category = categorize(m);
  // Minors carry a heavier weight — exposure of a child is more severe.
  const mult = category === "minor" ? 1.4 : category === "elder" ? 1.15 : 1;
  const load = (RISK_WEIGHT[m.riskLevel] + Math.min(m.exposuresCount, 6) * 5) * mult;
  const protectionScore = Math.max(0, Math.min(100, Math.round(100 - load)));
  return { member: m, category, protectionScore, status: statusFor(m), safeguards: CATEGORY_SAFEGUARDS[category] };
}

export interface FamilySummary {
  members: number;
  minors: number;
  atRisk: number;
  totalExposures: number;
  /** Mean protection score across the family. */
  protectionScore: number;
  posture: FamilyPosture;
  /** Most-exposed member, if any. */
  mostExposed?: MemberAssessment;
  /** Prioritized safeguards for members needing attention. */
  plan: { member: string; safeguard: Safeguard }[];
}

const RANK = { critical: 0, high: 1, standard: 2 } as const;

export function summarizeFamily(members: FamilyMember[]): FamilySummary {
  const assessments = members.map(assessMember);
  const atRisk = members.filter((m) => m.riskLevel !== "low").length;
  const totalExposures = members.reduce((s, m) => s + m.exposuresCount, 0);
  const protectionScore =
    assessments.length === 0 ? 100 : Math.round(assessments.reduce((s, a) => s + a.protectionScore, 0) / assessments.length);
  const anyCritical = assessments.some((a) => a.status === "critical");
  const anyAction = assessments.some((a) => a.status === "action_required");
  const posture: FamilyPosture = anyCritical || protectionScore < 45 ? "critical" : anyAction || protectionScore < 75 ? "elevated" : "secure";
  const mostExposed = [...assessments].sort(
    (a, b) => RISK_RANK[b.member.riskLevel] - RISK_RANK[a.member.riskLevel] || b.member.exposuresCount - a.member.exposuresCount,
  )[0];

  // Top safeguard for each member that needs attention, hardest cases first.
  const plan = assessments
    .filter((a) => a.status === "critical" || a.status === "action_required")
    .sort((a, b) => RISK_RANK[b.member.riskLevel] - RISK_RANK[a.member.riskLevel])
    .map((a) => ({ member: a.member.displayName, safeguard: [...a.safeguards].sort((x, y) => RANK[x.priority] - RANK[y.priority])[0] }));

  return { members: members.length, minors: members.filter((m) => m.isMinor).length, atRisk, totalExposures, protectionScore, posture, mostExposed, plan };
}

/** Assess + order the roster: highest-risk first. */
export function assessFamily(members: FamilyMember[]): MemberAssessment[] {
  return members
    .map(assessMember)
    .sort((a, b) => RISK_RANK[b.member.riskLevel] - RISK_RANK[a.member.riskLevel] || b.member.exposuresCount - a.member.exposuresCount);
}
