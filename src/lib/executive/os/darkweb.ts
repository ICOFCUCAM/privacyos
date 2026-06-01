/**
 * Executive Protection OS — dark-web exposure monitoring.
 *
 * Consolidates the principal's dark-web footprint: leaked credentials, dark-web
 * mentions, and PII appearing in breach dumps — drawn from the credential-leak
 * feed, threats and exposures. Pure and unit-tested.
 */

import type { Exposure, RiskLevel, Threat } from "@/lib/types";
import type { CredentialLeak } from "@/lib/suite-types";

const RISK_RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };

export type DarkWebCategory = "credential" | "dark_web_mention" | "breach_exposure";

export interface DarkWebSignal {
  category: DarkWebCategory;
  source: string;
  title: string;
  detail: string;
  riskLevel: RiskLevel;
  detectedAt: string;
  resolved: boolean;
  /** Records exposed in the originating breach (credential leaks only). */
  pwnCount?: number;
}

export interface DarkWebReport {
  signals: DarkWebSignal[];
  byCategory: Record<DarkWebCategory, number>;
  total: number;
  active: number;
  highest: RiskLevel | null;
  /** Sum of breach record counts across leaked credentials. */
  recordsExposed: number;
}

export interface DarkWebInput {
  credentialLeaks: CredentialLeak[];
  threats: Threat[];
  exposures: Exposure[];
}

export const DARKWEB_LABEL: Record<DarkWebCategory, string> = {
  credential: "Credential leaks",
  dark_web_mention: "Dark-web mentions",
  breach_exposure: "Breach records",
};

export function darkWebReport(input: DarkWebInput): DarkWebReport {
  const signals: DarkWebSignal[] = [];

  for (const l of input.credentialLeaks) {
    signals.push({ category: "credential", source: l.breachName, title: l.account, detail: l.dataClasses.join(", ") || "Credentials exposed", riskLevel: l.riskLevel, detectedAt: l.leakedAt ?? "", resolved: false, pwnCount: l.pwnCount });
  }

  for (const t of input.threats) {
    if (t.kind === "credential_leak") signals.push({ category: "credential", source: t.source, title: t.title, detail: t.detail, riskLevel: t.riskLevel, detectedAt: t.detectedAt, resolved: t.acknowledged });
    else if (t.kind === "dark_web_mention") signals.push({ category: "dark_web_mention", source: t.source, title: t.title, detail: t.detail, riskLevel: t.riskLevel, detectedAt: t.detectedAt, resolved: t.acknowledged });
  }

  for (const e of input.exposures) {
    if (e.source === "dark_web") signals.push({ category: "dark_web_mention", source: e.sourceName, title: e.snippet || "Dark-web listing", detail: e.snippet ?? "", riskLevel: e.riskLevel, detectedAt: e.discoveredAt, resolved: e.status === "removed" });
    else if (e.source === "breach_db") signals.push({ category: "breach_exposure", source: e.sourceName, title: e.snippet || "Breach record", detail: e.snippet ?? "", riskLevel: e.riskLevel, detectedAt: e.discoveredAt, resolved: e.status === "removed" });
  }

  const byCategory: Record<DarkWebCategory, number> = { credential: 0, dark_web_mention: 0, breach_exposure: 0 };
  for (const s of signals) byCategory[s.category] += 1;
  const activeSignals = signals.filter((s) => !s.resolved);
  const highest = activeSignals.length === 0 ? null : activeSignals.reduce<RiskLevel>((a, s) => (RISK_RANK[s.riskLevel] > RISK_RANK[a] ? s.riskLevel : a), "low");
  const recordsExposed = input.credentialLeaks.reduce((sum, l) => sum + (l.pwnCount || 0), 0);

  signals.sort((a, b) => Number(a.resolved) - Number(b.resolved) || RISK_RANK[b.riskLevel] - RISK_RANK[a.riskLevel]);
  return { signals, byCategory, total: signals.length, active: activeSignals.length, highest, recordsExposed };
}

export interface DarkWebRecommendation {
  category: DarkWebCategory;
  action: string;
  count: number;
}

const ACTION: Record<DarkWebCategory, (n: number) => string> = {
  credential: (n) => `Force-rotate ${n} leaked credential(s), revoke sessions, and enforce 2FA/passkeys.`,
  dark_web_mention: (n) => `Investigate ${n} dark-web mention(s); engage IR/takedown if the data is actionable.`,
  breach_exposure: (n) => `Request deletion of PII in ${n} breach record(s) and monitor for resale.`,
};

const ORDER: DarkWebCategory[] = ["credential", "dark_web_mention", "breach_exposure"];

/** A remediation recommendation per category with active signals. */
export function darkWebRecommendations(report: DarkWebReport): DarkWebRecommendation[] {
  const active: Record<DarkWebCategory, number> = { credential: 0, dark_web_mention: 0, breach_exposure: 0 };
  for (const s of report.signals) if (!s.resolved) active[s.category] += 1;
  return ORDER.filter((c) => active[c] > 0).map((c) => ({ category: c, action: ACTION[c](active[c]), count: active[c] }));
}
