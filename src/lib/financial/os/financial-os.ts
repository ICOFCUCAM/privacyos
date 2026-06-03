/**
 * Financial Exposure OS engine.
 *
 * A first-class protection domain — financial identity & payment exposure —
 * built by *reusing* existing signals rather than introducing a new data
 * pipeline: it derives risk from `Exposure`s (financial/credential categories),
 * `CredentialLeak`s (banking/payment/crypto accounts) and the dark-web threat
 * feed. Pure and unit-tested; mirrors the identity/brand OS engines so it slots
 * into the Protection Suite, scoring, scary-mirror and reports with no new
 * infrastructure.
 *
 * Four sub-indices, each 0–100 (higher = more at risk):
 *  - identityTheft   : exposed SSN/tax/financial PII that enables new-account fraud
 *  - accountTakeover : leaked credentials for money-bearing accounts
 *  - paymentExposure : exposed cards / payment instruments
 *  - darkWebFinancial: financial data trading on dark-web / underground sources
 */

import type { Exposure, Threat, RiskLevel, Recommendation } from "@/lib/types";
import type { CredentialLeak } from "@/lib/suite-types";
import type { NewCaseFields } from "@/lib/agents/recommendation-routing";
import { riskBandIndex } from "@/lib/scoring/bands";

export type FinancialBand = "low" | "elevated" | "high" | "critical";

const RISK_WEIGHT: Record<RiskLevel, number> = { low: 8, medium: 18, high: 32, critical: 48 };
const RISK_RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const BANDS: FinancialBand[] = ["low", "elevated", "high", "critical"];

/** Accounts/breaches that carry money or payment instruments. */
const MONEY_RE = /bank|pay(?:pal|ment)?|card|credit|debit|finance|wallet|crypto|coinbase|venmo|cash\s?app|brokerage|invest|stripe|stock|loan|mortgage|payroll/i;
/** Exposure source-names / snippets that indicate payment instruments. */
const PAYMENT_RE = /card|iban|account number|routing|cvv|bank|payment|wallet|crypto/i;

export interface FinancialInput {
  exposures: Exposure[];
  credentialLeaks: CredentialLeak[];
  threats: Threat[];
}

export interface FinancialFinding {
  kind: "identity" | "account" | "payment" | "darkweb";
  label: string;
  detail: string;
  riskLevel: RiskLevel;
  source: string;
}

export interface FinancialRecommendation {
  title: string;
  rationale: string;
  riskLevel: RiskLevel;
  actionLabel: string;
}

export interface FinancialRisk {
  overall: number;
  identityTheft: number;
  accountTakeover: number;
  paymentExposure: number;
  darkWebFinancial: number;
  band: FinancialBand;
  /** Distinct money-bearing accounts found leaked. */
  exposedAccounts: number;
  /** Whether any active financial threat warrants a case. */
  caseWorthy: boolean;
  findings: FinancialFinding[];
  recommendations: FinancialRecommendation[];
}

function isFinancialExposure(e: Exposure): boolean {
  return e.category === "financial" || e.category === "credential";
}
function isPaymentExposure(e: Exposure): boolean {
  return e.category === "financial" || PAYMENT_RE.test(`${e.sourceName} ${e.snippet}`);
}
function isMoneyLeak(l: CredentialLeak): boolean {
  return MONEY_RE.test(`${l.account} ${l.breachName} ${l.dataClasses.join(" ")}`);
}
function worst(items: { riskLevel: RiskLevel }[]): RiskLevel {
  return items.reduce<RiskLevel>((mx, it) => (RISK_RANK[it.riskLevel] > RISK_RANK[mx] ? it.riskLevel : mx), "low");
}

export function financialOverview(input: FinancialInput): FinancialRisk {
  const activeThreats = input.threats.filter((t) => !t.acknowledged);

  // ── identity theft: financial/credential PII + credential-leak threats
  const finExposures = input.exposures.filter(isFinancialExposure);
  const credThreats = activeThreats.filter((t) => t.kind === "credential_leak");
  const identityTheft = clamp(
    finExposures.reduce((s, e) => s + RISK_WEIGHT[e.riskLevel], 0) +
    credThreats.reduce((s, t) => s + RISK_WEIGHT[t.riskLevel] * 0.8, 0),
  );

  // ── account takeover: leaked credentials for money-bearing accounts
  const moneyLeaks = input.credentialLeaks.filter(isMoneyLeak);
  const accountTakeover = clamp(
    moneyLeaks.reduce((s, l) => s + RISK_WEIGHT[l.riskLevel] * 1.2, 0) +
    input.credentialLeaks.filter((l) => !isMoneyLeak(l)).reduce((s, l) => s + RISK_WEIGHT[l.riskLevel] * 0.4, 0),
  );

  // ── payment exposure: exposed cards / payment instruments
  const paymentExposures = input.exposures.filter(isPaymentExposure);
  const paymentExposure = clamp(paymentExposures.reduce((s, e) => s + RISK_WEIGHT[e.riskLevel] * 1.3, 0));

  // ── dark-web financial: financial data trading underground
  const darkWebThreats = activeThreats.filter((t) => t.kind === "dark_web_mention");
  const darkWebFinancial = clamp(
    moneyLeaks.reduce((s, l) => s + RISK_WEIGHT[l.riskLevel] * 0.6, 0) +
    darkWebThreats.reduce((s, t) => s + RISK_WEIGHT[t.riskLevel], 0),
  );

  const overall = clamp(identityTheft * 0.3 + accountTakeover * 0.3 + paymentExposure * 0.22 + darkWebFinancial * 0.18);
  const band = BANDS[riskBandIndex(overall)];
  const exposedAccounts = new Set(moneyLeaks.map((l) => l.account.toLowerCase())).size;

  const findings: FinancialFinding[] = [];
  for (const l of moneyLeaks) findings.push({ kind: "account", label: `Money account in a breach: ${l.account}`, detail: l.breachName, riskLevel: l.riskLevel, source: l.breachName });
  for (const e of paymentExposures) findings.push({ kind: "payment", label: `Payment data exposed`, detail: e.snippet || e.sourceName, riskLevel: e.riskLevel, source: e.sourceName });
  for (const e of finExposures.filter((x) => !isPaymentExposure(x))) findings.push({ kind: "identity", label: `Financial PII exposed`, detail: e.snippet || e.sourceName, riskLevel: e.riskLevel, source: e.sourceName });
  for (const t of darkWebThreats) findings.push({ kind: "darkweb", label: t.title, detail: t.detail, riskLevel: t.riskLevel, source: "dark web" });
  findings.sort((a, b) => RISK_RANK[b.riskLevel] - RISK_RANK[a.riskLevel]);

  const recommendations: FinancialRecommendation[] = [];
  if (accountTakeover >= 25 || moneyLeaks.length > 0) {
    recommendations.push({ title: "Secure your money-bearing accounts", rationale: "Leaked credentials were found for accounts that hold or move money — rotate and enable strong MFA.", riskLevel: worst(moneyLeaks.length ? moneyLeaks : [{ riskLevel: "high" }]), actionLabel: "Secure accounts" });
  }
  if (paymentExposure >= 25) {
    recommendations.push({ title: "Lock down exposed payment instruments", rationale: "Card or payment data appears exposed — freeze/replace the card and watch for fraudulent charges.", riskLevel: worst(paymentExposures), actionLabel: "Lock payments" });
  }
  if (identityTheft >= 40) {
    recommendations.push({ title: "Place a credit freeze", rationale: "Exposed financial PII enables new-account fraud — freeze credit at the bureaus and monitor for new accounts.", riskLevel: worst(finExposures.length ? finExposures : [{ riskLevel: "high" }]), actionLabel: "Freeze credit" });
  }

  const caseWorthy = overall >= 50 || moneyLeaks.some((l) => RISK_RANK[l.riskLevel] >= 2);

  return {
    overall, identityTheft, accountTakeover, paymentExposure, darkWebFinancial,
    band, exposedAccounts, caseWorthy, findings, recommendations,
  };
}

const IMPACT: Record<RiskLevel, number> = { low: 6, medium: 12, high: 20, critical: 28 };

/**
 * Project the engine's recommendations into the platform's `Recommendation`
 * shape so they flow through the existing pipeline — AI Recommendations,
 * Protection Home's "needs you" queue, and the autonomy thresholds — owned by
 * the Security Agent. Pure: lets Financial Exposure reuse the whole rec/case
 * machinery with no new surface.
 */
export function financialRecommendations(risk: FinancialRisk, subjectId: string): Recommendation[] {
  return risk.recommendations.map((r, i) => ({
    id: `fin-${subjectId}-${i}`,
    subjectId,
    agent: "security",
    title: r.title,
    rationale: r.rationale,
    riskLevel: r.riskLevel,
    impact: IMPACT[r.riskLevel],
    actionLabel: r.actionLabel,
  }));
}

/**
 * A case to open when financial exposure is material — reuses the existing case
 * model (breach_response type). Critical money-account fraud is routed to the
 * Incident Response Agent; otherwise the Security Agent owns remediation.
 */
export function financialCaseToOpen(risk: FinancialRisk): NewCaseFields | null {
  if (!risk.caseWorthy) return null;
  const critical = risk.overall >= 75 || risk.accountTakeover >= 60;
  return {
    type: "breach_response",
    title: "Financial exposure detected",
    summary: `${risk.exposedAccounts} exposed money account(s); financial risk ${risk.overall}/100 (${risk.band}).`,
    riskLevel: critical ? "critical" : "high",
    assignedAgent: critical ? "incident" : "security",
  };
}

/**
 * A dedicated notification when financial exposure turns critical — surfaced in
 * the notification feed (and the bell) so a newly-detected money-account threat
 * reaches the customer immediately. Returns null below the critical threshold.
 * Pure: the surfaces just prepend it when the customer is entitled.
 */
export function financialNotification(risk: FinancialRisk, now: number = Date.now()): import("@/lib/suite-types").Notification | null {
  if (risk.overall < 75) return null;
  return {
    id: "fin-critical",
    kind: "alert",
    title: "Critical financial exposure detected",
    body: `Financial exposure is ${risk.overall}/100 (${risk.band}) across ${risk.exposedAccounts} money account(s). We're securing accounts and opening a protection case.`,
    riskLevel: "critical",
    read: false,
    createdAt: new Date(now).toISOString(),
  };
}
