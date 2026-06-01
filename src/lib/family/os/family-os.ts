/**
 * Family Protection OS engine.
 *
 * Turns the family roster + the principal's footprint into a full family-
 * protection picture: a categorized registry, exposure-vector tracking, child
 * safety (minor monitoring + alerts + risk scoring), and a family graph that
 * propagates the principal's shared (household) exposures to each relative.
 * Pure and unit-tested.
 */

import type { Exposure, RiskLevel } from "@/lib/types";
import type { FamilyMember } from "@/lib/suite-types";

const RISK_WEIGHT: Record<RiskLevel, number> = { low: 8, medium: 18, high: 32, critical: 48 };
const RISK_RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/* ── Registry ────────────────────────────────────────────────────────────── */

export type RelationCategory = "spouse" | "child" | "parent" | "relative";

export const REGISTRY_LABEL: Record<RelationCategory, string> = {
  spouse: "Spouse", child: "Children", parent: "Parents", relative: "Relatives",
};

const REGISTRY_ORDER: RelationCategory[] = ["spouse", "child", "parent", "relative"];

export function categorizeRelation(relation: string): RelationCategory {
  const r = relation.toLowerCase();
  if (/spouse|wife|husband|partner|fianc/.test(r)) return "spouse";
  if (/child|son|daughter|kid|minor/.test(r)) return "child";
  if (/parent|mother|father|\bmom\b|\bdad\b/.test(r)) return "parent";
  return "relative";
}

export interface RegistryGroup {
  category: RelationCategory;
  label: string;
  members: FamilyMember[];
}

/** Group the roster into Spouse / Children / Parents / Relatives (non-empty, ordered). */
export function buildRegistry(members: FamilyMember[]): RegistryGroup[] {
  return REGISTRY_ORDER
    .map((category) => ({ category, label: REGISTRY_LABEL[category], members: members.filter((m) => categorizeRelation(m.relation) === category) }))
    .filter((g) => g.members.length > 0);
}

/* ── Family graph & risk propagation ─────────────────────────────────────── */

/** Categories of the principal's footprint that are *shared* by the household. */
const SHARED_CATEGORIES = new Set(["address", "family", "photo"]);

/** The principal's exposures that propagate to relatives (shared address/surname/likeness). */
export function sharedExposures(exposures: Exposure[]): Exposure[] {
  return exposures.filter((e) => SHARED_CATEGORIES.has(e.category));
}

export interface MemberRisk {
  member: FamilyMember;
  category: RelationCategory;
  /** Risk from the member's own footprint. */
  own: number;
  /** Risk inherited from the principal's shared household exposures. */
  propagated: number;
  /** Combined 0–100 risk. */
  total: number;
  band: RiskLevel;
}

function bandFor(score: number): RiskLevel {
  if (score >= 75) return "critical";
  if (score >= 50) return "high";
  if (score >= 25) return "medium";
  return "low";
}

/**
 * Per-member risk: own footprint + propagated household risk. Minors inherit
 * shared exposures more heavily (they can't act to reduce them themselves).
 */
export function memberRisks(members: FamilyMember[], shared: Exposure[]): MemberRisk[] {
  const sharedLoad = shared.reduce((s, e) => s + RISK_WEIGHT[e.riskLevel], 0);
  return members
    .map((member) => {
      const own = clamp(RISK_WEIGHT[member.riskLevel] + Math.min(member.exposuresCount, 5) * 5);
      const propagated = clamp(sharedLoad * (member.isMinor ? 0.7 : 0.5));
      const total = clamp(own * 0.6 + propagated * 0.4);
      return { member, category: categorizeRelation(member.relation), own, propagated, total, band: bandFor(total) };
    })
    .sort((a, b) => b.total - a.total);
}

export interface FamilyGraphEdge {
  member: FamilyMember;
  category: RelationCategory;
  risk: number;
  /** Shared exposures driving this member's inherited risk. */
  inherited: number;
}

export interface FamilyGraph {
  principal: string;
  edges: FamilyGraphEdge[];
  shared: Exposure[];
  /** Members materially affected by at least one shared exposure. */
  propagationReach: number;
}

/** Relationship map: principal → each member, with shared-exposure propagation. */
export function buildFamilyGraph(principal: string, members: FamilyMember[], exposures: Exposure[]): FamilyGraph {
  const shared = sharedExposures(exposures);
  const risks = memberRisks(members, shared);
  const edges: FamilyGraphEdge[] = risks.map((r) => ({ member: r.member, category: r.category, risk: r.total, inherited: r.propagated }));
  return { principal, edges, shared, propagationReach: shared.length > 0 ? members.length : 0 };
}

/* ── Child safety ────────────────────────────────────────────────────────── */

export interface ChildSafetyReport {
  minors: number;
  monitored: MemberRisk[];
  /** Minors (or any member) whose combined risk crosses the alert threshold. */
  alerts: MemberRisk[];
  highestChildRisk: number;
}

const ALERT_THRESHOLD = 50;

export function childSafety(risks: MemberRisk[]): ChildSafetyReport {
  const minors = risks.filter((r) => r.member.isMinor);
  const alerts = risks.filter((r) => (r.member.isMinor && r.total >= ALERT_THRESHOLD) || RISK_RANK[r.member.riskLevel] >= 2);
  return {
    minors: minors.length,
    monitored: minors,
    alerts: alerts.sort((a, b) => b.total - a.total),
    highestChildRisk: minors.reduce((m, r) => Math.max(m, r.total), 0),
  };
}

/* ── Exposure tracking ───────────────────────────────────────────────────── */

export type ExposureVector = "photos" | "school" | "social" | "location";
export type VectorStatus = "clear" | "monitoring" | "exposed";

export interface VectorTracking {
  vector: ExposureVector;
  label: string;
  status: VectorStatus;
  affected: number;
  detail: string;
}

export const VECTOR_LABEL: Record<ExposureVector, string> = {
  photos: "Photos / likeness", school: "School records", social: "Social profiles", location: "Location exposure",
};

/**
 * The four family exposure vectors, each scored from real signals: the
 * principal's photo/address footprint (shared) plus the roster's own profiles.
 */
export function exposureTracking(members: FamilyMember[], exposures: Exposure[]): VectorTracking[] {
  const minors = members.filter((m) => m.isMinor).length;
  const withPresence = members.filter((m) => m.exposuresCount > 0).length;
  const photoExp = exposures.filter((e) => e.category === "photo" || e.source === "ai_generated");
  const locationExp = exposures.filter((e) => e.category === "address");
  const highRoster = members.some((m) => RISK_RANK[m.riskLevel] >= 2);

  const statusFrom = (exposed: boolean, monitoring: boolean): VectorStatus => (exposed ? "exposed" : monitoring ? "monitoring" : "clear");

  return [
    { vector: "photos", label: VECTOR_LABEL.photos, status: statusFrom(photoExp.length > 0, members.length > 0), affected: members.length, detail: photoExp.length ? `${photoExp.length} exposed photo/likeness asset(s) — affects the whole household.` : "No exposed family photos detected." },
    { vector: "school", label: VECTOR_LABEL.school, status: statusFrom(minors > 0 && highRoster, minors > 0), affected: minors, detail: minors ? `${minors} minor(s) — school/enrollment records monitored.` : "No minors on the registry." },
    { vector: "social", label: VECTOR_LABEL.social, status: statusFrom(withPresence > 0 && highRoster, withPresence > 0), affected: withPresence, detail: withPresence ? `${withPresence} member(s) with a discoverable social footprint.` : "No social profiles tracked." },
    { vector: "location", label: VECTOR_LABEL.location, status: statusFrom(locationExp.length > 0, members.length > 0), affected: locationExp.length > 0 ? members.length : 0, detail: locationExp.length ? `Shared home address exposed — locates every household member.` : "No shared-location exposure detected." },
  ];
}

/* ── Roll-up ─────────────────────────────────────────────────────────────── */

export interface FamilyOverview {
  members: number;
  minors: number;
  /** Mean combined member risk, 0–100. */
  familyRisk: number;
  alerts: number;
  propagationReach: number;
}

export function familyOverview(members: FamilyMember[], exposures: Exposure[]): FamilyOverview {
  const shared = sharedExposures(exposures);
  const risks = memberRisks(members, shared);
  const safety = childSafety(risks);
  const familyRisk = risks.length ? clamp(risks.reduce((s, r) => s + r.total, 0) / risks.length) : 0;
  return { members: members.length, minors: safety.minors, familyRisk, alerts: safety.alerts.length, propagationReach: shared.length > 0 ? members.length : 0 };
}
