/**
 * Composite business-health score.
 *
 * Blends the dimensions a board cares about — growth, retention, efficiency,
 * defensibility and compliance — into a single 0–100 score plus a letter grade.
 * Pure and unit-tested; callers pass already-computed metrics so this never
 * performs IO and stays trivially explainable.
 */

export interface HealthInput {
  /** Net revenue retention, percent (e.g. 112). */
  nrr: number;
  /** Net new MRR this month, USD (growth signal). */
  netNewMrr: number;
  /** LTV : CAC ratio. */
  ltvToCac: number;
  /** CAC payback in months. */
  paybackMonths: number;
  /** Blended detection accuracy, 0–100. */
  detectionAccuracy: number;
  /** Step-automation rate, 0–100. */
  automationRate: number;
  /** SOC 2 readiness, 0–100. */
  compliance: number;
  /** Enterprise share of MRR, 0–100. */
  enterpriseShare: number;
}

export interface HealthDimension {
  key: string;
  label: string;
  /** Normalized 0–100 sub-score. */
  score: number;
  /** Short human verdict. */
  verdict: string;
}

export interface BusinessHealth {
  /** Overall 0–100 composite. */
  score: number;
  grade: "A" | "B" | "C" | "D";
  dimensions: HealthDimension[];
}

const clamp = (n: number) => Math.max(0, Math.min(100, n));

function verdictFor(score: number): string {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Healthy";
  if (score >= 50) return "Watch";
  return "At risk";
}

function gradeFor(score: number): BusinessHealth["grade"] {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  return "D";
}

/**
 * Compute the composite. Each dimension is normalized to 0–100 against sensible
 * SaaS benchmarks, then equally weighted into the headline score.
 */
export function businessHealth(input: HealthInput): BusinessHealth {
  // Growth: net-new MRR > 0 is good; scale generously, cap at 100.
  const growthScore = clamp(input.netNewMrr <= 0 ? 35 : 60 + Math.min(40, input.netNewMrr / 1000));
  // Retention: 100% NRR = 70; 120%+ = 100; below 90% degrades fast.
  const retentionScore = clamp((input.nrr - 80) * 2.5);
  // Efficiency: LTV:CAC of 3 = 75, 5+ = 100; payback under 12mo is a bonus.
  const efficiencyScore = clamp(input.ltvToCac * 18 + (input.paybackMonths <= 12 ? 10 : 0));
  // Defensibility: average of detection accuracy and automation rate.
  const moatScore = clamp((input.detectionAccuracy + input.automationRate) / 2);
  // Compliance: readiness directly.
  const complianceScore = clamp(input.compliance);
  // Enterprise mix: higher annual-contract share = stickier revenue.
  const enterpriseScore = clamp(40 + input.enterpriseShare * 0.6);

  const dimensions: HealthDimension[] = [
    { key: "growth", label: "Growth", score: Math.round(growthScore), verdict: verdictFor(growthScore) },
    { key: "retention", label: "Retention", score: Math.round(retentionScore), verdict: verdictFor(retentionScore) },
    { key: "efficiency", label: "Efficiency", score: Math.round(efficiencyScore), verdict: verdictFor(efficiencyScore) },
    { key: "moat", label: "Defensibility", score: Math.round(moatScore), verdict: verdictFor(moatScore) },
    { key: "compliance", label: "Compliance", score: Math.round(complianceScore), verdict: verdictFor(complianceScore) },
    { key: "enterprise", label: "Enterprise mix", score: Math.round(enterpriseScore), verdict: verdictFor(enterpriseScore) },
  ];

  const score = Math.round(dimensions.reduce((s, d) => s + d.score, 0) / dimensions.length);
  return { score, grade: gradeFor(score), dimensions };
}
