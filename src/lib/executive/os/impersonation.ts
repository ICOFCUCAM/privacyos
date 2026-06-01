/**
 * Executive Protection OS — impersonation & deepfake monitoring.
 *
 * Consolidates the principal's identity-impersonation surface: fake social
 * profiles, deepfakes/synthetic media, and lookalike/phishing domains — drawn
 * from threats, incidents, AI-generated exposures and domain risks. Pure and
 * unit-tested. Takedown cases for these are opened by the existing case
 * pipeline; this surfaces them via openImpersonationCases.
 */

import type { Case, Exposure, RiskLevel, Threat } from "@/lib/types";
import type { DomainRisk, Incident } from "@/lib/suite-types";

const RISK_RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };

export type ImpersonationCategory = "fake_profile" | "deepfake" | "lookalike_domain" | "synthetic_media";

export interface ImpersonationSignal {
  category: ImpersonationCategory;
  source: string;
  title: string;
  detail: string;
  riskLevel: RiskLevel;
  detectedAt: string;
  resolved: boolean;
}

export interface ImpersonationReport {
  signals: ImpersonationSignal[];
  byCategory: Record<ImpersonationCategory, number>;
  total: number;
  active: number;
  highest: RiskLevel | null;
}

export interface ImpersonationInput {
  threats: Threat[];
  incidents: Incident[];
  domainRisks: DomainRisk[];
  exposures: Exposure[];
}

export const IMPERSONATION_LABEL: Record<ImpersonationCategory, string> = {
  fake_profile: "Fake profiles",
  deepfake: "Deepfakes",
  lookalike_domain: "Lookalike domains",
  synthetic_media: "Synthetic media",
};

const DOMAIN_IMPERSONATION = new Set(["typosquat", "phishing"]);

export function impersonationReport(input: ImpersonationInput): ImpersonationReport {
  const signals: ImpersonationSignal[] = [];

  for (const t of input.threats) {
    if (t.kind === "impersonation") signals.push({ category: "fake_profile", source: t.source, title: t.title, detail: t.detail, riskLevel: t.riskLevel, detectedAt: t.detectedAt, resolved: t.acknowledged });
    else if (t.kind === "deepfake") signals.push({ category: "deepfake", source: t.source, title: t.title, detail: t.detail, riskLevel: t.riskLevel, detectedAt: t.detectedAt, resolved: t.acknowledged });
  }

  for (const i of input.incidents) {
    const done = i.status === "resolved" || i.status === "dismissed";
    if (i.kind === "impersonation") signals.push({ category: "fake_profile", source: "incident", title: i.title, detail: i.detail, riskLevel: i.riskLevel, detectedAt: i.detectedAt, resolved: done });
    else if (i.kind === "deepfake") signals.push({ category: "deepfake", source: "incident", title: i.title, detail: i.detail, riskLevel: i.riskLevel, detectedAt: i.detectedAt, resolved: done });
  }

  for (const d of input.domainRisks) {
    if (DOMAIN_IMPERSONATION.has(d.kind)) signals.push({ category: "lookalike_domain", source: d.domain, title: `${d.kind === "phishing" ? "Phishing" : "Lookalike"} domain: ${d.domain}`, detail: d.detail, riskLevel: d.riskLevel, detectedAt: d.detectedAt, resolved: d.resolved });
  }

  for (const e of input.exposures) {
    if (e.source === "ai_generated") signals.push({ category: "synthetic_media", source: e.sourceName, title: e.snippet || "AI-generated content", detail: e.snippet ?? "", riskLevel: e.riskLevel, detectedAt: e.discoveredAt, resolved: e.status === "removed" });
  }

  const byCategory: Record<ImpersonationCategory, number> = { fake_profile: 0, deepfake: 0, lookalike_domain: 0, synthetic_media: 0 };
  for (const s of signals) byCategory[s.category] += 1;
  const activeSignals = signals.filter((s) => !s.resolved);
  const highest = activeSignals.length === 0 ? null : activeSignals.reduce<RiskLevel>((a, s) => (RISK_RANK[s.riskLevel] > RISK_RANK[a] ? s.riskLevel : a), "low");

  signals.sort((a, b) => Number(a.resolved) - Number(b.resolved) || RISK_RANK[b.riskLevel] - RISK_RANK[a.riskLevel]);
  return { signals, byCategory, total: signals.length, active: activeSignals.length, highest };
}

export interface ImpersonationRecommendation {
  category: ImpersonationCategory;
  action: string;
  count: number;
}

const TAKEDOWN_ACTION: Record<ImpersonationCategory, (n: number) => string> = {
  fake_profile: (n) => `Report ${n} impersonation profile(s) to the platforms and file identity/trademark claims.`,
  deepfake: (n) => `Issue takedown/DMCA for ${n} deepfake(s) and preserve evidence for escalation.`,
  lookalike_domain: (n) => `File UDRP / registrar-abuse complaints for ${n} lookalike/phishing domain(s).`,
  synthetic_media: (n) => `Demand removal of ${n} synthetic-media asset(s) from the host and search.`,
};

const CATEGORY_ORDER: ImpersonationCategory[] = ["fake_profile", "deepfake", "lookalike_domain", "synthetic_media"];

/** A takedown recommendation per category with active signals. */
export function impersonationRecommendations(report: ImpersonationReport): ImpersonationRecommendation[] {
  const activeByCat: Record<ImpersonationCategory, number> = { fake_profile: 0, deepfake: 0, lookalike_domain: 0, synthetic_media: 0 };
  for (const s of report.signals) if (!s.resolved) activeByCat[s.category] += 1;
  return CATEGORY_ORDER.filter((c) => activeByCat[c] > 0).map((c) => ({ category: c, action: TAKEDOWN_ACTION[c](activeByCat[c]), count: activeByCat[c] }));
}

/** Open impersonation/deepfake takedown cases (opened by the case pipeline). */
export function openImpersonationCases(cases: Case[]): Case[] {
  return cases
    .filter((c) => (c.type === "impersonation_takedown" || c.type === "deepfake_incident") && c.status !== "resolved")
    .sort((a, b) => RISK_RANK[b.riskLevel] - RISK_RANK[a.riskLevel] || b.createdAt.localeCompare(a.createdAt));
}
