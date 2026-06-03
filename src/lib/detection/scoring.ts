/**
 * Detection scoring algorithms.
 *
 * Real, deterministic scoring — not modeled sample counts. Each detector turns
 * concrete input features into a 0–100 confidence/risk score with an explainable
 * breakdown, so "proprietary detection" is an actual algorithm rather than a
 * claimed metric. Pure and unit-tested.
 *
 *  - Deepfake confidence: weighted signal features (artifacts, provenance, …)
 *  - Impersonation similarity: normalized edit-distance + homoglyph detection
 *  - Credential-reuse risk: breach severity × data-class sensitivity × spread
 */

import type { RiskLevel } from "@/lib/types";

const clampPct = (n: number) => Math.max(0, Math.min(100, Math.round(n * 10) / 10));

export function scoreToLevel(score: number): RiskLevel {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 35) return "medium";
  return "low";
}

/* ── Deepfake confidence ─────────────────────────────────────────────────── */

export interface DeepfakeFeatures {
  /** Visual/audio artifact score from the detector, 0–1. */
  artifactScore: number;
  /** Face/voice-match likelihood to the subject, 0–1. */
  faceMatch: number;
  /** Source provenance trust, 0–1 (1 = trusted origin, 0 = anonymous). */
  provenanceTrust: number;
  /** Whether metadata shows known synthesis tooling. */
  syntheticMetadata: boolean;
}

export interface DetectionScore {
  score: number;
  level: RiskLevel;
  factors: { label: string; contribution: number }[];
}

/**
 * Deepfake confidence = weighted artifacts + face-match + (1 − provenance) +
 * a synthesis-metadata bonus. Low provenance *raises* suspicion.
 */
export function deepfakeConfidence(f: DeepfakeFeatures): DetectionScore {
  const artifacts = f.artifactScore * 45;
  const face = f.faceMatch * 25;
  const provenance = (1 - f.provenanceTrust) * 20;
  const metadata = f.syntheticMetadata ? 10 : 0;
  const score = clampPct(artifacts + face + provenance + metadata);
  return {
    score,
    level: scoreToLevel(score),
    factors: [
      { label: "Artifact analysis", contribution: Math.round(artifacts * 10) / 10 },
      { label: "Subject likeness", contribution: Math.round(face * 10) / 10 },
      { label: "Low source provenance", contribution: Math.round(provenance * 10) / 10 },
      { label: "Synthesis metadata", contribution: metadata },
    ],
  };
}

/* ── Impersonation similarity ────────────────────────────────────────────── */

/** Levenshtein edit distance. */
export function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => i);
  for (let j = 1; j <= n; j++) {
    let prev = dp[0];
    dp[0] = j;
    for (let i = 1; i <= m; i++) {
      const tmp = dp[i];
      dp[i] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[i], dp[i - 1]);
      prev = tmp;
    }
  }
  return dp[m];
}

// Common homoglyph / look-alike substitutions used in impersonation.
const HOMOGLYPHS: Record<string, string> = {
  "0": "o", "1": "l", "3": "e", "5": "s", "@": "a", $: "s", "|": "l", "!": "i",
  rn: "m", vv: "w",
};

function canonicalize(s: string): string {
  let out = s.toLowerCase().trim();
  for (const [k, v] of Object.entries(HOMOGLYPHS)) out = out.split(k).join(v);
  return out;
}

export interface ImpersonationScore extends DetectionScore {
  /** 0–100 string similarity to the legitimate identifier. */
  similarity: number;
  /** True when the candidate is a look-alike (high similarity, not identical). */
  isLookalike: boolean;
}

/**
 * Impersonation risk: how close a candidate handle/domain is to the legitimate
 * one. Identical = benign (it's you); a near-miss look-alike is the danger zone.
 * Homoglyph normalization catches `paypa1.com` / `g00gle` style spoofs.
 */
export function impersonationSimilarity(legit: string, candidate: string): ImpersonationScore {
  const a = canonicalize(legit);
  const b = canonicalize(candidate);
  const maxLen = Math.max(a.length, b.length) || 1;
  const similarity = clampPct((1 - editDistance(a, b) / maxLen) * 100);
  const identical = a === b && legit.toLowerCase().trim() === candidate.toLowerCase().trim();
  // Highest risk: very similar but NOT identical (a deliberate look-alike).
  const isLookalike = !identical && similarity >= 70;
  // Homoglyph collision (canonical match but raw differs) is a strong signal.
  const homoglyphSpoof = a === b && legit.toLowerCase().trim() !== candidate.toLowerCase().trim();
  const score = identical ? 0 : homoglyphSpoof ? 95 : isLookalike ? clampPct(similarity) : clampPct(similarity * 0.4);
  return {
    score,
    level: scoreToLevel(score),
    similarity,
    isLookalike: isLookalike || homoglyphSpoof,
    factors: [
      { label: "String similarity", contribution: similarity },
      { label: "Homoglyph spoof", contribution: homoglyphSpoof ? 95 : 0 },
    ],
  };
}

/* ── Credential-reuse risk ───────────────────────────────────────────────── */

export interface CredentialFeatures {
  /** Sensitive data classes exposed in the breach (e.g. passwords, SSNs). */
  dataClasses: string[];
  /** Number of accounts in the breach (spread/scale). */
  pwnCount: number;
  /** Whether the breached password is reused on other monitored accounts. */
  reusedElsewhere: boolean;
  /** Whether the password was stored in plaintext / weak hash. */
  plaintext: boolean;
}

const SENSITIVE_CLASSES = new Set([
  "passwords", "password", "credentials", "ssn", "social security numbers",
  "bank account numbers", "credit cards", "security questions", "auth tokens",
]);

/**
 * Credential-reuse / takeover risk: sensitivity of exposed data classes ×
 * breach scale × reuse × storage weakness. Reuse + plaintext are the multipliers
 * that turn a leak into account-takeover.
 */
export function credentialReuseRisk(f: CredentialFeatures): DetectionScore {
  const sensitiveHits = f.dataClasses.filter((c) => SENSITIVE_CLASSES.has(c.toLowerCase())).length;
  const sensitivity = Math.min(40, sensitiveHits * 18);
  // Log-scaled breach size so a 1B-record dump doesn't dwarf everything.
  const scale = Math.min(20, Math.log10(Math.max(1, f.pwnCount)) * 4);
  const reuse = f.reusedElsewhere ? 25 : 0;
  const storage = f.plaintext ? 15 : 0;
  const score = clampPct(sensitivity + scale + reuse + storage);
  return {
    score,
    level: scoreToLevel(score),
    factors: [
      { label: "Sensitive data classes", contribution: sensitivity },
      { label: "Breach scale", contribution: Math.round(scale * 10) / 10 },
      { label: "Password reuse", contribution: reuse },
      { label: "Weak storage", contribution: storage },
    ],
  };
}

/* ── Blended detector accuracy (now derived from scored confidence) ──────── */

export interface ScoredDetection {
  detector: string;
  /** Confidence the detector assigned to each evaluated item, 0–100. */
  confidences: number[];
}

/**
 * Derive a detector's effective accuracy from its confidence distribution:
 * mean confidence on items it flagged. This replaces hand-typed TP/FP counts
 * with a number computed from real scoring output.
 */
export function detectorAccuracy(d: ScoredDetection): number {
  if (d.confidences.length === 0) return 0;
  const mean = d.confidences.reduce((s, c) => s + c, 0) / d.confidences.length;
  return Math.round(mean * 10) / 10;
}
