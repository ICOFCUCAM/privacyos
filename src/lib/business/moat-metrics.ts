/**
 * Proprietary-data, detection-accuracy and automation-moat metrics.
 *
 * These are the defensibility metrics investors underwrite an AI-security
 * platform on: how accurate the detection models are, how much work the
 * autonomous agents do without a human (the automation moat), and how large the
 * proprietary intelligence corpus has grown. Pure and unit-tested — derived from
 * the same domain dataset the product runs on.
 */

import type { AgentAction } from "@/lib/suite-types";

const pct = (n: number) => Math.round(n * 1000) / 10;

/* ── Detection accuracy ──────────────────────────────────────────────────── */

export interface DetectionStats {
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  /** precision = TP / (TP + FP). */
  precision: number;
  /** recall = TP / (TP + FN). */
  recall: number;
  /** F1 = harmonic mean of precision & recall. */
  f1: number;
  /** Overall accuracy headline, 0–100. */
  accuracy: number;
}

export interface DetectorScore {
  detector: string;
  label: string;
  stats: DetectionStats;
}

export interface DetectionSample {
  detector: string;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
}

const DETECTOR_LABEL: Record<string, string> = {
  deepfake: "Deepfake Detection",
  impersonation: "Impersonation Detection",
  credential: "Credential-Leak Detection",
  broker: "Broker Match Resolution",
  sentiment: "Sentiment Classification",
  threat: "Threat Correlation",
};

export function detectionStats(s: DetectionSample): DetectionStats {
  const precision = s.truePositives + s.falsePositives === 0 ? 0 : s.truePositives / (s.truePositives + s.falsePositives);
  const recall = s.truePositives + s.falseNegatives === 0 ? 0 : s.truePositives / (s.truePositives + s.falseNegatives);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return {
    truePositives: s.truePositives,
    falsePositives: s.falsePositives,
    falseNegatives: s.falseNegatives,
    precision: pct(precision),
    recall: pct(recall),
    f1: pct(f1),
    accuracy: pct(f1),
  };
}

export function scoreDetectors(samples: DetectionSample[]): DetectorScore[] {
  return samples.map((s) => ({
    detector: s.detector,
    label: DETECTOR_LABEL[s.detector] ?? s.detector,
    stats: detectionStats(s),
  }));
}

/** Weighted blended accuracy across all detectors (by sample volume). */
export function blendedAccuracy(samples: DetectionSample[]): number {
  let weightedF1 = 0;
  let total = 0;
  for (const s of samples) {
    const vol = s.truePositives + s.falsePositives + s.falseNegatives;
    weightedF1 += detectionStats(s).f1 * vol;
    total += vol;
  }
  return total === 0 ? 0 : Math.round((weightedF1 / total) * 10) / 10;
}

/* ── Automation moat ─────────────────────────────────────────────────────── */

export interface AutomationMoat {
  totalActions: number;
  autonomousActions: number;
  humanActions: number;
  /** Share of all actions executed without a human, 0–100. */
  automationRate: number;
  /** Estimated analyst-hours saved (autonomous actions × minutes/action). */
  hoursSaved: number;
  /** Annualized labor-cost equivalent of automation, USD. */
  laborValue: number;
}

const MINUTES_PER_ACTION = 22; // avg analyst minutes to do one action manually
const ANALYST_HOURLY = 75; // blended fully-loaded analyst cost / hour

/**
 * The automation moat: what fraction of defensive work the agents do without a
 * human, and the labor value that represents. `humanActionKinds` are the action
 * kinds that still require sign-off (e.g. escalations).
 */
export function automationMoat(
  actions: AgentAction[],
  humanActionKinds: string[] = ["escalate"],
  windowDays = 30,
): AutomationMoat {
  const total = actions.length;
  const human = actions.filter((a) => humanActionKinds.includes(a.kind)).length;
  const autonomous = total - human;
  const automationRate = total === 0 ? 0 : pct(autonomous / total);
  // Scale the observed window to an annual figure.
  const annualMultiplier = windowDays > 0 ? 365 / windowDays : 1;
  const annualAutonomous = autonomous * annualMultiplier;
  const hoursSaved = Math.round((annualAutonomous * MINUTES_PER_ACTION) / 60);
  const laborValue = Math.round(hoursSaved * ANALYST_HOURLY);
  return { totalActions: total, autonomousActions: autonomous, humanActions: human, automationRate, hoursSaved, laborValue };
}

/* ── Proprietary data corpus ─────────────────────────────────────────────── */

export interface DataCorpus {
  /** Distinct signal types we ingest. */
  signalTypes: number;
  /** Total intelligence records under management. */
  records: number;
  /** Records added per day (velocity of the proprietary corpus). */
  dailyVelocity: number;
  /** Coverage breadth — number of distinct source categories. */
  sources: number;
}

export function dataCorpus(input: {
  exposures: number;
  threats: number;
  mentions: number;
  incidents: number;
  credentialLeaks: number;
  domainRisks: number;
  sources: number;
  windowDays?: number;
}): DataCorpus {
  const records =
    input.exposures + input.threats + input.mentions + input.incidents +
    input.credentialLeaks + input.domainRisks;
  const windowDays = input.windowDays ?? 30;
  return {
    signalTypes: 6,
    records,
    dailyVelocity: windowDays > 0 ? Math.round(records / windowDays) : records,
    sources: input.sources,
  };
}
