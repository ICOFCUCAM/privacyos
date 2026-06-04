/**
 * Credit Monitoring OS engine.
 *
 * A first-class protection domain: continuous monitoring of the customer's
 * credit file for the events that signal identity theft — new accounts, hard
 * inquiries, derogatory marks, score drops, address changes and public records.
 *
 * Pure + unit-tested, and connector-driven: the engine scores a `CreditProfile`
 * regardless of where it came from. Live bureau data (Equifax / Experian /
 * TransUnion, directly or via an aggregator such as Array / Plaid / MX) is a
 * contracted, FCRA-regulated feed wired in behind `CreditSource`; until a partner
 * key is present the deterministic demo profile keeps the surface explorable.
 * This mirrors the broker-removal model, where detection is built and the
 * partner provides the regulated half.
 */

import type { NewCaseFields } from "@/lib/agents/recommendation-routing";
import type { RiskLevel } from "@/lib/types";

export type CreditBureau = "equifax" | "experian" | "transunion";

export type CreditAlertKind =
  | "new_account"
  | "hard_inquiry"
  | "derogatory"
  | "balance_spike"
  | "score_drop"
  | "address_change"
  | "public_record";

export const CREDIT_ALERT_LABEL: Record<CreditAlertKind, string> = {
  new_account: "New account opened",
  hard_inquiry: "Hard inquiry",
  derogatory: "Derogatory mark",
  balance_spike: "Unusual balance increase",
  score_drop: "Score drop",
  address_change: "Address change reported",
  public_record: "Public record / lien",
};

/** Alert kinds that indicate possible identity theft (vs. routine activity). */
const FRAUD_KINDS = new Set<CreditAlertKind>(["new_account", "derogatory", "public_record", "address_change"]);

export interface CreditAlert {
  id: string;
  kind: CreditAlertKind;
  bureau: CreditBureau;
  detail: string;
  riskLevel: RiskLevel;
  detectedAt: string;
}

export interface CreditProfile {
  /** FICO-range score, 300–850. */
  score: number;
  /** Change since the previous pull (negative = a drop). */
  scoreDelta: number;
  alerts: CreditAlert[];
}

export type CreditBand = "excellent" | "good" | "fair" | "poor";

export function creditBand(score: number): CreditBand {
  if (score >= 800) return "excellent";
  if (score >= 670) return "good";
  if (score >= 580) return "fair";
  return "poor";
}

const RISK_RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };

export interface CreditOverview {
  score: number;
  scoreDelta: number;
  band: CreditBand;
  /** Total alerts on file. */
  alertCount: number;
  /** Alerts that indicate possible identity theft. */
  fraudIndicators: number;
  /** Distinct bureaus reporting. */
  bureausReporting: number;
  /** Alerts, fraud-first then most-recent. */
  alerts: CreditAlert[];
  /** True when backed by a live bureau/aggregator feed (vs. the demo profile). */
  live: boolean;
}

export function isFraudIndicator(kind: CreditAlertKind): boolean {
  return FRAUD_KINDS.has(kind);
}

/** Roll a credit profile up into the monitoring overview. */
export function creditOverview(profile: CreditProfile, opts: { live?: boolean } = {}): CreditOverview {
  const alerts = [...profile.alerts].sort(
    (a, b) =>
      Number(isFraudIndicator(b.kind)) - Number(isFraudIndicator(a.kind)) ||
      RISK_RANK[b.riskLevel] - RISK_RANK[a.riskLevel] ||
      b.detectedAt.localeCompare(a.detectedAt),
  );
  return {
    score: profile.score,
    scoreDelta: profile.scoreDelta,
    band: creditBand(profile.score),
    alertCount: alerts.length,
    fraudIndicators: alerts.filter((a) => isFraudIndicator(a.kind)).length,
    bureausReporting: new Set(alerts.map((a) => a.bureau)).size,
    alerts,
    live: opts.live ?? false,
  };
}

export interface CreditRecommendation {
  title: string;
  rationale: string;
  actionLabel: string;
  riskLevel: RiskLevel;
}

/** Prioritized actions from the overview — freeze on fraud, dispute on derogatory. */
export function creditRecommendations(o: CreditOverview): CreditRecommendation[] {
  const recs: CreditRecommendation[] = [];
  if (o.fraudIndicators > 0) {
    recs.push({
      title: "Freeze your credit at all three bureaus",
      rationale: `${o.fraudIndicators} fraud-indicative alert(s) on file — a freeze stops new-account fraud immediately and is free to place and lift.`,
      actionLabel: "Freeze credit",
      riskLevel: "critical",
    });
  }
  if (o.alerts.some((a) => a.kind === "derogatory" || a.kind === "public_record")) {
    recs.push({
      title: "Dispute inaccurate derogatory marks",
      rationale: "Derogatory marks or public records can be disputed with the bureaus; we draft and track the dispute.",
      actionLabel: "Start dispute",
      riskLevel: "high",
    });
  }
  if (o.scoreDelta <= -20) {
    recs.push({
      title: "Investigate the score drop",
      rationale: `Your score fell ${Math.abs(o.scoreDelta)} points — we correlate it with the recent alerts so you know why.`,
      actionLabel: "Review activity",
      riskLevel: "medium",
    });
  }
  return recs;
}

/**
 * Open an identity-theft case when fraud-indicative alerts surface (deduped by
 * title) — the cascade hook so credit alerts flow into the same Case → Legal →
 * Evidence pipeline as every other detection.
 */
export function creditCasesFromAlerts(alerts: CreditAlert[], openTitles: string[]): NewCaseFields[] {
  const fraud = alerts.filter((a) => isFraudIndicator(a.kind));
  if (fraud.length === 0) return [];
  const title = "Credit-file identity-theft review";
  if (openTitles.includes(title)) return [];
  const worst = fraud.reduce<RiskLevel>((a, x) => (RISK_RANK[x.riskLevel] > RISK_RANK[a] ? x.riskLevel : a), "low");
  return [{
    type: "breach_response",
    title,
    summary: `${fraud.length} fraud-indicative credit alert(s) detected (e.g. ${fraud.slice(0, 3).map((a) => CREDIT_ALERT_LABEL[a.kind]).join(", ")}). Freeze credit, dispute unauthorized items and monitor for new accounts.`,
    riskLevel: worst === "low" ? "high" : worst,
    assignedAgent: "security",
  }];
}
