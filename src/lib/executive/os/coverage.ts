/**
 * Executive Protection OS — protection coverage rollup.
 *
 * One at-a-glance status across every protection pillar (residence, doxxing,
 * impersonation, dark web, threat actors, family, travel), for the command
 * view. Pure and unit-tested; takes the already-computed per-pillar counts.
 */

export type PillarStatus = "secure" | "action_required";

export interface PillarCoverage {
  key: string;
  label: string;
  href: string;
  count: number;
  status: PillarStatus;
}

export interface CoverageCounts {
  residenceExposed: number;
  doxxingLeaks: number;
  impersonationActive: number;
  darkWebActive: number;
  actorsActive: number;
  familyAtRisk: number;
  travelElevated: number;
}

const PILLARS: { key: keyof CoverageCounts; label: string; href: string }[] = [
  { key: "residenceExposed", label: "Residence", href: "/dashboard/executive/residence" },
  { key: "doxxingLeaks", label: "Doxxing", href: "/dashboard/executive/doxxing" },
  { key: "impersonationActive", label: "Impersonation", href: "/dashboard/executive/impersonation" },
  { key: "darkWebActive", label: "Dark web", href: "/dashboard/executive/dark-web" },
  { key: "actorsActive", label: "Threat actors", href: "/dashboard/executive/threat-actors" },
  { key: "familyAtRisk", label: "Family", href: "/dashboard/family" },
  { key: "travelElevated", label: "Travel", href: "/dashboard/travel" },
];

/** Per-pillar coverage, pillars needing action first. */
export function protectionCoverage(counts: CoverageCounts): PillarCoverage[] {
  return PILLARS
    .map(({ key, label, href }) => {
      const count = counts[key];
      return { key, label, href, count, status: (count > 0 ? "action_required" : "secure") as PillarStatus };
    })
    .sort((a, b) => b.count - a.count);
}

export interface CoverageSummary {
  pillars: number;
  secure: number;
  needingAction: number;
}

export function summarizeCoverage(coverage: PillarCoverage[]): CoverageSummary {
  const needingAction = coverage.filter((p) => p.status === "action_required").length;
  return { pillars: coverage.length, secure: coverage.length - needingAction, needingAction };
}
