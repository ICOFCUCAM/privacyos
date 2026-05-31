/**
 * Live detector accuracy.
 *
 * Runs the real detection-scoring algorithms (lib/detection/scoring) over the
 * actual footprint to derive each detector's effective accuracy from its
 * confidence distribution — replacing hand-typed true/false-positive samples.
 * Pure and unit-tested.
 */

import type { CredentialLeak, DomainRisk, Incident } from "@/lib/suite-types";
import type { Exposure, RiskLevel } from "@/lib/types";
import {
  credentialReuseRisk, deepfakeConfidence, detectorAccuracy, impersonationSimilarity,
} from "./scoring";

const LEVEL_BASE: Record<RiskLevel, number> = { low: 0.3, medium: 0.55, high: 0.8, critical: 0.95 };

export interface LiveDetector {
  detector: string;
  label: string;
  /** Effective accuracy 0–100 from the confidence distribution. */
  accuracy: number;
  /** Items the detector scored this cycle. */
  evaluated: number;
}

export interface LiveDetectionInput {
  incidents: Incident[];
  credentialLeaks: CredentialLeak[];
  domainRisks: DomainRisk[];
  exposures: Exposure[];
  /** The legitimate primary domain, for impersonation comparison. */
  primaryDomain?: string;
}

/**
 * Score every detector over the live footprint and return per-detector accuracy
 * plus a volume-weighted blended figure.
 */
export function liveDetectorAccuracy(input: LiveDetectionInput): {
  detectors: LiveDetector[];
  blended: number;
} {
  const detectors: LiveDetector[] = [];

  // Deepfake: score each synthetic-media incident from its risk + evidence.
  const deepfakes = input.incidents.filter((i) => i.kind === "deepfake");
  const dfConf = deepfakes.map((i) =>
    deepfakeConfidence({
      artifactScore: LEVEL_BASE[i.riskLevel],
      faceMatch: Math.min(1, 0.5 + i.evidenceCount * 0.1),
      provenanceTrust: 0.15,
      syntheticMetadata: i.evidenceCount > 0,
    }).score,
  );
  detectors.push({ detector: "deepfake", label: "Deepfake Detection", accuracy: detectorAccuracy({ detector: "deepfake", confidences: dfConf }), evaluated: deepfakes.length });

  // Impersonation: score typosquat domains against the primary domain.
  const legit = input.primaryDomain ?? "";
  const typos = input.domainRisks.filter((d) => d.kind === "typosquat");
  const impConf = typos.map((d) => impersonationSimilarity(legit, d.domain).score);
  detectors.push({ detector: "impersonation", label: "Impersonation Detection", accuracy: detectorAccuracy({ detector: "impersonation", confidences: impConf }), evaluated: typos.length });

  // Credential reuse: score each credential leak.
  const credConf = input.credentialLeaks.map((c) =>
    credentialReuseRisk({
      dataClasses: c.dataClasses,
      pwnCount: c.pwnCount,
      reusedElsewhere: c.riskLevel === "critical" || c.riskLevel === "high",
      plaintext: c.dataClasses.some((x) => /password|plaintext/i.test(x)),
    }).score,
  );
  detectors.push({ detector: "credential", label: "Credential-Leak Detection", accuracy: detectorAccuracy({ detector: "credential", confidences: credConf }), evaluated: input.credentialLeaks.length });

  // Volume-weighted blended accuracy across detectors that evaluated anything.
  const scored = detectors.filter((d) => d.evaluated > 0);
  const totalVol = scored.reduce((s, d) => s + d.evaluated, 0);
  const blended = totalVol === 0
    ? 0
    : Math.round((scored.reduce((s, d) => s + d.accuracy * d.evaluated, 0) / totalVol) * 10) / 10;

  return { detectors, blended };
}
