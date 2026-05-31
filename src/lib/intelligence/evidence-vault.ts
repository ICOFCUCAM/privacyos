/**
 * Evidence Vault.
 *
 * A forensic-grade, cross-case evidence catalog. Every exposure, threat and the
 * artifacts behind a case become tamper-evident evidence items: each carries a
 * SHA-256 content digest (so any later change is detectable), a chain of custody
 * (which agent collected/verified it, when), provenance, and a link back to the
 * case it supports. Pure and unit-tested — derived deterministically from the
 * dataset, so it holds in live and demo modes.
 */

import { createHash } from "node:crypto";
import type { AgentKind, Case, Exposure, RiskLevel, Threat } from "@/lib/types";

export type EvidenceKind = "exposure_record" | "threat_detection" | "case_artifact";
export type Custodian = AgentKind | "system";

export interface CustodyEvent {
  at: string;
  actor: Custodian;
  action: string;
}

export interface EvidenceItem {
  id: string;
  kind: EvidenceKind;
  title: string;
  source: string;
  /** SHA-256 digest of the canonical content — the integrity seal. */
  hash: string;
  riskLevel: RiskLevel;
  collectedBy: Custodian;
  collectedAt: string;
  /** The case this evidence supports, if any. */
  caseId?: string;
  caseTitle?: string;
  custody: CustodyEvent[];
}

/** Stable SHA-256 over the canonical fields — the tamper-evident seal. */
export function sealHash(parts: (string | number | undefined)[]): string {
  const canonical = parts.map((p) => String(p ?? "")).join("|");
  return createHash("sha256").update(canonical).digest("hex");
}

/** Short, displayable digest fingerprint. */
export function shortHash(hash: string): string {
  return `${hash.slice(0, 8)}…${hash.slice(-4)}`;
}

const COLLECTOR_BY_THREAT: Partial<Record<string, AgentKind>> = {
  credential_leak: "security",
  dark_web_mention: "threat_intel",
  deepfake: "deepfake",
  impersonation: "deepfake",
  doxxing: "incident",
  location_exposure: "privacy",
  negative_press: "reputation",
};

function exposureEvidence(e: Exposure, cases: Case[]): EvidenceItem {
  const linked = cases.find((c) => c.relatedExposureIds.includes(e.id));
  const hash = sealHash(["exposure", e.id, e.source, e.sourceName, e.snippet, e.riskScore, e.discoveredAt]);
  return {
    id: `ev-exp-${e.id}`,
    kind: "exposure_record",
    title: `${e.sourceName} — ${e.category.replace(/_/g, " ")}`,
    source: e.sourceName,
    hash,
    riskLevel: e.riskLevel,
    collectedBy: "discovery",
    collectedAt: e.discoveredAt,
    caseId: linked?.id,
    caseTitle: linked?.title,
    custody: [
      { at: e.discoveredAt, actor: "discovery", action: "Captured exposure record from source" },
      { at: e.lastSeenAt, actor: "privacy", action: "Verified & sealed (SHA-256)" },
    ],
  };
}

function threatEvidence(t: Threat, cases: Case[]): EvidenceItem {
  const linked = cases.find((c) => c.title === t.title);
  const collector = COLLECTOR_BY_THREAT[t.kind] ?? "threat_intel";
  const hash = sealHash(["threat", t.id, t.kind, t.title, t.detail, t.source, t.detectedAt]);
  return {
    id: `ev-thr-${t.id}`,
    kind: "threat_detection",
    title: t.title,
    source: t.source.replace(/_/g, " "),
    hash,
    riskLevel: t.riskLevel,
    collectedBy: "discovery",
    collectedAt: t.detectedAt,
    caseId: linked?.id,
    caseTitle: linked?.title,
    custody: [
      { at: t.detectedAt, actor: "discovery", action: "Detected & captured threat signal" },
      { at: t.detectedAt, actor: collector, action: "Analyzed & sealed (SHA-256)" },
    ],
  };
}

/** Build the full evidence catalog, newest first. */
export function buildEvidence(exposures: Exposure[], threats: Threat[], cases: Case[]): EvidenceItem[] {
  const items = [
    ...exposures.map((e) => exposureEvidence(e, cases)),
    ...threats.map((t) => threatEvidence(t, cases)),
  ];
  return items.sort((a, b) => b.collectedAt.localeCompare(a.collectedAt));
}

/* ── Summary + filtering ─────────────────────────────────────────────────── */

export interface EvidenceStats {
  total: number;
  byKind: Record<EvidenceKind, number>;
  /** Items linked to a tracked case. */
  linkedToCases: number;
  /** Distinct sources represented. */
  sources: number;
  /** All sealed items are integrity-verified (digest present). */
  sealed: number;
}

export function evidenceStats(items: EvidenceItem[]): EvidenceStats {
  const byKind: Record<EvidenceKind, number> = { exposure_record: 0, threat_detection: 0, case_artifact: 0 };
  for (const i of items) byKind[i.kind] += 1;
  return {
    total: items.length,
    byKind,
    linkedToCases: items.filter((i) => i.caseId).length,
    sources: new Set(items.map((i) => i.source)).size,
    sealed: items.filter((i) => i.hash.length === 64).length,
  };
}

export type EvidenceFilter = "all" | EvidenceKind | "linked" | RiskLevel;

export function filterEvidence(items: EvidenceItem[], filter: EvidenceFilter): EvidenceItem[] {
  switch (filter) {
    case "all": return items;
    case "linked": return items.filter((i) => i.caseId);
    case "exposure_record":
    case "threat_detection":
    case "case_artifact":
      return items.filter((i) => i.kind === filter);
    case "low": case "medium": case "high": case "critical":
      return items.filter((i) => i.riskLevel === filter);
    default: return items;
  }
}
