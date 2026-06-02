/**
 * Free Exposure Assessment — the conversion engine.
 *
 * Not a usage tier: one public scan, one report, one protection opportunity.
 * It reuses the Scary Mirror engine to produce the "scary window" — a
 * category breakdown + protection score — then frames what's free (the scan,
 * report, score, 10 broker removals) against everything that's locked behind a
 * Protection Plan. The goal of free is discovery and conversion, not protection.
 * Pure and unit-tested.
 */

import type { MirrorCategory, ScaryMirrorReport } from "./scary-mirror";

/** Customer-facing labels for the scary window, per the assessment spec. */
const CATEGORY_LABEL: Record<MirrorCategory, string> = {
  brokers: "Data broker listings",
  breaches: "Credential leaks",
  social: "Public profiles exposing personal information",
  reputation: "Reputation concerns",
  identity: "Identity-related records",
  financial: "Financial exposures",
  darkweb: "Dark-web exposures",
};

export interface AssessmentRow {
  category: MirrorCategory;
  label: string;
  count: number;
}

export interface FreeAssessment {
  name: string;
  /** Total exposures found — the headline number. */
  totalExposures: number;
  /** 0–100, higher = safer (the inverse of exposure). */
  protectionScore: number;
  /** Per-category counts for the scary window. */
  breakdown: AssessmentRow[];
  /** What the free assessment includes (builds trust). */
  freeIncludes: string[];
  /** Capabilities visible but locked behind a Protection Plan. */
  lockedFeatures: string[];
  /** Free broker-removal allowance granted with the assessment. */
  freeRemovals: number;
}

export const FREE_INCLUDES: string[] = [
  "One complete exposure scan",
  "Exposure report",
  "Protection score",
  "Up to 10 broker removals",
];

export const LOCKED_FEATURES: string[] = [
  "Dark Web Monitoring",
  "Identity Protection",
  "Reputation Monitoring",
  "Executive Protection",
  "Family Protection",
  "Financial Exposure Protection",
  "Continuous Monitoring",
  "AI Agents",
  "Real-Time Alerts",
];

export const FREE_REMOVALS = 10;

/** Project a Scary Mirror report into the free-assessment "scary window". */
export function freeAssessment(report: ScaryMirrorReport): FreeAssessment {
  return {
    name: report.name,
    totalExposures: report.totalFindings,
    protectionScore: report.protectionScore,
    breakdown: report.findings.map((f) => ({
      category: f.category,
      label: CATEGORY_LABEL[f.category],
      count: f.count,
    })),
    freeIncludes: FREE_INCLUDES,
    lockedFeatures: LOCKED_FEATURES,
    freeRemovals: FREE_REMOVALS,
  };
}
