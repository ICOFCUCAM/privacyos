/**
 * Third-Party (vendor) risk intelligence.
 *
 * Turns raw vendor assessments into an operational vendor-risk register: a
 * review cadence and freshness status per risk tier, recommended remediation
 * actions derived from the findings, a due-diligence lifecycle stage, and a
 * portfolio posture with concentration analysis. Pure and unit-tested; derived
 * from the assessments so it holds in live and demo modes.
 */

import type { RiskLevel } from "@/lib/types";
import type { ThirdPartyRisk } from "@/lib/suite-types";

const RISK_RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };
const DAY = 86_400_000;

/** Required reassessment interval (days) by risk tier. */
export const REVIEW_CADENCE_DAYS: Record<RiskLevel, number> = { critical: 30, high: 90, medium: 180, low: 365 };

export type ReviewStatus = "current" | "due" | "overdue";
export type DueDiligenceStage = "Onboarded" | "Assessed" | "Remediation" | "Monitoring";

export interface VendorAssessment {
  vendor: ThirdPartyRisk;
  cadenceDays: number;
  daysSinceAssessment: number;
  reviewStatus: ReviewStatus;
  recommendedActions: string[];
  stage: DueDiligenceStage;
}

function reviewStatusFor(daysSince: number, cadence: number): ReviewStatus {
  if (daysSince >= cadence) return "overdue";
  if (daysSince >= cadence * 0.8) return "due";
  return "current";
}

function recommendedActions(v: ThirdPartyRisk): string[] {
  const actions: string[] = [];
  const f = v.findings.toLowerCase();
  if (/breach/.test(f)) actions.push("Confirm breach scope & affected data; require notification.");
  if (/dmarc|spf|spoof/.test(f)) actions.push("Require DMARC enforcement & email-auth hardening.");
  if (/takeover|subdomain/.test(f)) actions.push("Remediate subdomain-takeover exposure.");

  if (v.riskLevel === "critical" || v.riskLevel === "high") {
    actions.push("Request a remediation plan with evidence & timeline.");
    actions.push("Restrict data-access scope to least privilege.");
    if (v.riskLevel === "critical") actions.push("Escalate to a formal security review / consider offboarding.");
  } else if (v.riskLevel === "medium") {
    actions.push("Send a security questionnaire & verify controls.");
  } else {
    actions.push("Continue periodic monitoring — no action required.");
  }
  return actions;
}

function stageFor(v: ThirdPartyRisk, status: ReviewStatus): DueDiligenceStage {
  if (v.riskLevel === "critical" || v.riskLevel === "high") return "Remediation";
  if (status === "overdue") return "Assessed";
  return "Monitoring";
}

export function assessVendor(v: ThirdPartyRisk, now = Date.now()): VendorAssessment {
  const cadenceDays = REVIEW_CADENCE_DAYS[v.riskLevel];
  const daysSinceAssessment = Math.max(0, Math.round((now - new Date(v.assessedAt).getTime()) / DAY));
  const reviewStatus = reviewStatusFor(daysSinceAssessment, cadenceDays);
  return {
    vendor: v,
    cadenceDays,
    daysSinceAssessment,
    reviewStatus,
    recommendedActions: recommendedActions(v),
    stage: stageFor(v, reviewStatus),
  };
}

export type VendorPostureLevel = "managed" | "elevated" | "critical";

export interface VendorPortfolio {
  total: number;
  highRisk: number;
  overdueReviews: number;
  avgScore: number;
  /** 0–100, higher = better managed (inverse of weighted risk + overdue penalty). */
  posture: number;
  postureLevel: VendorPostureLevel;
  /** Vendor count by category, most-represented first. */
  concentration: { category: string; count: number }[];
}

const RISK_WEIGHT: Record<RiskLevel, number> = { low: 4, medium: 10, high: 20, critical: 32 };

export function summarizeVendors(vendors: ThirdPartyRisk[], now = Date.now()): VendorPortfolio {
  const assessments = vendors.map((v) => assessVendor(v, now));
  const total = vendors.length;
  const highRisk = vendors.filter((v) => v.riskLevel === "high" || v.riskLevel === "critical").length;
  const overdueReviews = assessments.filter((a) => a.reviewStatus === "overdue").length;
  const avgScore = total === 0 ? 0 : Math.round(vendors.reduce((s, v) => s + v.riskScore, 0) / total);

  const load = vendors.reduce((s, v) => s + RISK_WEIGHT[v.riskLevel], 0) + overdueReviews * 6;
  const posture = total === 0 ? 100 : Math.max(0, Math.min(100, Math.round(100 - load / total - overdueReviews * 4)));
  const postureLevel: VendorPostureLevel =
    vendors.some((v) => v.riskLevel === "critical") || posture < 45 ? "critical" : highRisk > 0 || posture < 72 ? "elevated" : "managed";

  const byCat = new Map<string, number>();
  for (const v of vendors) byCat.set(v.category, (byCat.get(v.category) ?? 0) + 1);
  const concentration = [...byCat.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  return { total, highRisk, overdueReviews, avgScore, posture, postureLevel, concentration };
}

/** Enrich + order the register: overdue and highest-risk first. */
export function vendorRegister(vendors: ThirdPartyRisk[], now = Date.now()): VendorAssessment[] {
  const statusRank: Record<ReviewStatus, number> = { overdue: 0, due: 1, current: 2 };
  return vendors
    .map((v) => assessVendor(v, now))
    .sort(
      (a, b) =>
        statusRank[a.reviewStatus] - statusRank[b.reviewStatus] ||
        RISK_RANK[b.vendor.riskLevel] - RISK_RANK[a.vendor.riskLevel] ||
        b.vendor.riskScore - a.vendor.riskScore,
    );
}
