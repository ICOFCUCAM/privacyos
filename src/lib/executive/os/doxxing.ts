/**
 * Executive Protection OS — doxxing protection.
 *
 * Classifies the leaks that enable doxxing into the four buckets a protection
 * team triages: address, phone, family and employer. Derived from exposures,
 * threats, the family roster and employee data. Pure and unit-tested.
 */

import type { Exposure, RiskLevel, Threat } from "@/lib/types";
import type { EmployeeExposure, FamilyMember } from "@/lib/suite-types";

const RISK_RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };

export type LeakKind = "address" | "phone" | "family" | "employer";

export interface DoxxLeak {
  kind: LeakKind;
  source: string;
  detail: string;
  riskLevel: RiskLevel;
  detectedAt: string;
}

export interface DoxxingReport {
  leaks: DoxxLeak[];
  byKind: Record<LeakKind, number>;
  total: number;
  highest: RiskLevel | null;
}

export interface DoxxInput {
  exposures: Exposure[];
  threats: Threat[];
  family: FamilyMember[];
  employees: EmployeeExposure[];
}

export function doxxingReport(input: DoxxInput): DoxxingReport {
  const leaks: DoxxLeak[] = [];

  for (const e of input.exposures) {
    if (e.category === "address") leaks.push({ kind: "address", source: e.sourceName, detail: e.snippet || "Home address exposed", riskLevel: e.riskLevel, detectedAt: e.discoveredAt });
    else if (e.category === "phone") leaks.push({ kind: "phone", source: e.sourceName, detail: e.snippet || "Phone number exposed", riskLevel: e.riskLevel, detectedAt: e.discoveredAt });
    else if (e.category === "family") leaks.push({ kind: "family", source: e.sourceName, detail: e.snippet || "Family member data exposed", riskLevel: e.riskLevel, detectedAt: e.discoveredAt });
    else if (e.category === "employer") leaks.push({ kind: "employer", source: e.sourceName, detail: e.snippet || "Employer/affiliation exposed", riskLevel: e.riskLevel, detectedAt: e.discoveredAt });
  }

  for (const t of input.threats) {
    if (t.acknowledged) continue;
    if (t.kind === "doxxing" || t.kind === "location_exposure") {
      leaks.push({ kind: "address", source: t.source, detail: t.title, riskLevel: t.riskLevel, detectedAt: t.detectedAt });
    }
  }

  for (const m of input.family) {
    if (m.exposuresCount > 0) {
      leaks.push({ kind: "family", source: "people-search", detail: `${m.displayName} (${m.relation}) — ${m.exposuresCount} exposure(s)`, riskLevel: m.riskLevel, detectedAt: "" });
    }
  }

  for (const e of input.employees) {
    leaks.push({ kind: "employer", source: e.source.replace(/_/g, " "), detail: `${e.employeeName ?? e.employeeEmail}: ${e.exposureType}`, riskLevel: e.riskLevel, detectedAt: e.detectedAt });
  }

  const byKind: Record<LeakKind, number> = { address: 0, phone: 0, family: 0, employer: 0 };
  for (const l of leaks) byKind[l.kind] += 1;
  const highest = leaks.length === 0 ? null : leaks.reduce<RiskLevel>((a, l) => (RISK_RANK[l.riskLevel] > RISK_RANK[a] ? l.riskLevel : a), "low");

  leaks.sort((a, b) => RISK_RANK[b.riskLevel] - RISK_RANK[a.riskLevel]);
  return { leaks, byKind, total: leaks.length, highest };
}

export const LEAK_LABEL: Record<LeakKind, string> = {
  address: "Address leaks",
  phone: "Phone leaks",
  family: "Family leaks",
  employer: "Employer leaks",
};
