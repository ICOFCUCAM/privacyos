/**
 * Business / Brand Protection OS — unified brand risk.
 *
 * Composes the siloed corporate-exposure signals (domain risks, workforce
 * exposure, third-party/vendor risk, leaked credentials) into one Brand Risk
 * Score + four sub-indices, and isolates brand-impersonation (lookalike /
 * phishing domains). Pure and unit-tested; sits on top of the existing
 * domain/workforce/vendor engines.
 */

import type { RiskLevel } from "@/lib/types";
import type { CredentialLeak, DomainRisk, EmployeeExposure, ThirdPartyRisk } from "@/lib/suite-types";
import { riskBandIndex } from "@/lib/scoring/bands";
import { financialOverview } from "@/lib/financial/os/financial-os";

const RISK_WEIGHT: Record<RiskLevel, number> = { low: 8, medium: 18, high: 32, critical: 48 };
const RISK_RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export type RiskBand = "low" | "elevated" | "high" | "critical";

const RISK_BANDS: RiskBand[] = ["low", "elevated", "high", "critical"];

export function brandBand(score: number): RiskBand {
  return RISK_BANDS[riskBandIndex(score)];
}

export interface BrandRiskInput {
  domainRisks: DomainRisk[];
  employeeExposures: EmployeeExposure[];
  thirdPartyRisks: ThirdPartyRisk[];
  credentialLeaks: CredentialLeak[];
}

export interface BrandRiskIndices {
  /** Composite brand risk, 0–100 (higher = more at risk). */
  overall: number;
  domain: number;
  workforce: number;
  supplyChain: number;
  credential: number;
  financial: number;
  band: RiskBand;
}

export interface BrandIndexMeta {
  key: keyof Omit<BrandRiskIndices, "overall" | "band">;
  label: string;
}

export const BRAND_INDEX_META: BrandIndexMeta[] = [
  { key: "domain", label: "Domain & brand" },
  { key: "workforce", label: "Workforce" },
  { key: "supplyChain", label: "Supply chain" },
  { key: "credential", label: "Credentials" },
  { key: "financial", label: "Financial exposure" },
];

export function brandRiskIndices(input: BrandRiskInput): BrandRiskIndices {
  const domain = clamp(input.domainRisks.filter((d) => !d.resolved).reduce((s, d) => s + RISK_WEIGHT[d.riskLevel] * 1.1, 0));
  const workforce = clamp(input.employeeExposures.reduce((s, e) => s + RISK_WEIGHT[e.riskLevel], 0));
  const supplyChain = clamp(input.thirdPartyRisks.reduce((s, v) => s + RISK_WEIGHT[v.riskLevel], 0));
  const credential = clamp(input.credentialLeaks.reduce((s, l) => s + RISK_WEIGHT[l.riskLevel] * 0.9, 0));
  // Financial exposure across the org's leaked money-bearing accounts (reuses the Financial OS engine).
  const financial = financialOverview({ exposures: [], credentialLeaks: input.credentialLeaks, threats: [] }).overall;
  const overall = clamp(domain * 0.27 + workforce * 0.27 + supplyChain * 0.18 + credential * 0.15 + financial * 0.13);
  return { overall, domain, workforce, supplyChain, credential, financial, band: brandBand(overall) };
}

/* ── Brand impersonation (lookalike / phishing domains) ──────────────────── */

const IMPERSONATION_KINDS = new Set(["typosquat", "phishing"]);

export interface BrandImpersonation {
  domain: string;
  kind: string;
  detail: string;
  riskLevel: RiskLevel;
  resolved: boolean;
  detectedAt: string;
}

/** Lookalike / phishing domains impersonating the brand, worst (unresolved) first. */
export function brandImpersonation(domainRisks: DomainRisk[]): BrandImpersonation[] {
  return domainRisks
    .filter((d) => IMPERSONATION_KINDS.has(d.kind))
    .map((d) => ({ domain: d.domain, kind: d.kind, detail: d.detail, riskLevel: d.riskLevel, resolved: d.resolved, detectedAt: d.detectedAt }))
    .sort((a, b) => Number(a.resolved) - Number(b.resolved) || RISK_RANK[b.riskLevel] - RISK_RANK[a.riskLevel]);
}

/* ── Roll-up ─────────────────────────────────────────────────────────────── */

export interface BrandOverview {
  brandRisk: number;
  band: RiskBand;
  domainRisks: number;
  exposedEmployees: number;
  vendorsAtRisk: number;
  credentialLeaks: number;
  impersonationDomains: number;
}

export function brandOverview(input: BrandRiskInput): BrandOverview {
  const indices = brandRiskIndices(input);
  return {
    brandRisk: indices.overall,
    band: indices.band,
    domainRisks: input.domainRisks.filter((d) => !d.resolved).length,
    exposedEmployees: new Set(input.employeeExposures.map((e) => e.employeeEmail)).size,
    vendorsAtRisk: input.thirdPartyRisks.filter((v) => RISK_RANK[v.riskLevel] >= 2).length,
    credentialLeaks: input.credentialLeaks.length,
    impersonationDomains: brandImpersonation(input.domainRisks).filter((d) => !d.resolved).length,
  };
}
