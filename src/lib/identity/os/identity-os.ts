/**
 * Digital Identity OS engine.
 *
 * An account-centric view of the principal's credential exposure: a per-account
 * inventory with account-takeover (ATO) risk, password hygiene, a composite
 * identity risk score, and an identity-restoration playbook. Distinct from the
 * signal-centric dark-web pillar — this organizes the same breaches into the
 * accounts a defender actually hardens. Pure and unit-tested.
 */

import type { Exposure, RiskLevel } from "@/lib/types";
import type { CredentialLeak } from "@/lib/suite-types";

const RISK_WEIGHT: Record<RiskLevel, number> = { low: 8, medium: 18, high: 32, critical: 48 };
const RISK_RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function riskBand(score: number): RiskLevel {
  if (score >= 75) return "critical";
  if (score >= 50) return "high";
  if (score >= 25) return "medium";
  return "low";
}

const PASSWORD_RE = /password|pwd|credential/i;

export interface IdentityAccount {
  account: string;
  breaches: number;
  passwordExposed: boolean;
  dataClasses: string[];
  darkWeb: boolean;
  /** Account-takeover risk, 0–100. */
  atoRisk: number;
  band: RiskLevel;
}

export interface IdentityInput {
  credentialLeaks: CredentialLeak[];
  exposures: Exposure[];
  knownEmails?: string[];
}

/** Per-account inventory: group breaches by account, score ATO risk. */
export function buildAccounts(input: IdentityInput): IdentityAccount[] {
  const darkWebPresence = input.exposures.some((e) => e.source === "dark_web");
  const byAccount = new Map<string, CredentialLeak[]>();
  for (const l of input.credentialLeaks) {
    const list = byAccount.get(l.account) ?? [];
    list.push(l);
    byAccount.set(l.account, list);
  }

  const accounts: IdentityAccount[] = [...byAccount.entries()].map(([account, leaks]) => {
    const passwordExposed = leaks.some((l) => l.dataClasses.some((c) => PASSWORD_RE.test(c)));
    const dataClasses = [...new Set(leaks.flatMap((l) => l.dataClasses))];
    const worst = leaks.reduce<RiskLevel>((a, l) => (RISK_RANK[l.riskLevel] > RISK_RANK[a] ? l.riskLevel : a), "low");
    // "On the dark web" means this account's *credentials* are plausibly traded:
    // a dark-web presence in the footprint AND an exposed password (not just an
    // email in a breach). Avoids flagging every breached account.
    const onDarkWeb = darkWebPresence && passwordExposed;
    const atoRisk = clamp(leaks.length * 16 + (passwordExposed ? 34 : 0) + RISK_WEIGHT[worst] * 0.6 + (onDarkWeb ? 12 : 0));
    return { account, breaches: leaks.length, passwordExposed, dataClasses, darkWeb: onDarkWeb, atoRisk, band: riskBand(atoRisk) };
  });

  // Known accounts with no breach on record — monitored, clean.
  for (const email of input.knownEmails ?? []) {
    if (!byAccount.has(email)) {
      accounts.push({ account: email, breaches: 0, passwordExposed: false, dataClasses: [], darkWeb: false, atoRisk: 0, band: "low" });
    }
  }

  return accounts.sort((a, b) => b.atoRisk - a.atoRisk);
}

/* ── Password hygiene ────────────────────────────────────────────────────── */

export interface PasswordHygiene {
  accountsWithPasswords: number;
  /** Accounts breached more than once — a strong reuse / staleness signal. */
  reuseRisk: number;
  /** 0–100 hygiene (higher = better). */
  score: number;
}

export function passwordHygiene(accounts: IdentityAccount[]): PasswordHygiene {
  const accountsWithPasswords = accounts.filter((a) => a.passwordExposed).length;
  const reuseRisk = accounts.filter((a) => a.breaches > 1).length;
  const score = clamp(100 - accountsWithPasswords * 16 - reuseRisk * 12);
  return { accountsWithPasswords, reuseRisk, score };
}

/* ── Identity risk score ─────────────────────────────────────────────────── */

export interface IdentityRisk {
  /** Composite identity-exposure / ATO risk, 0–100 (higher = more at risk). */
  overall: number;
  band: RiskLevel;
  breachedAccounts: number;
  passwordsExposed: number;
}

export function identityRisk(accounts: IdentityAccount[]): IdentityRisk {
  const breached = accounts.filter((a) => a.breaches > 0);
  const maxAto = breached.reduce((m, a) => Math.max(m, a.atoRisk), 0);
  const meanAto = breached.length ? breached.reduce((s, a) => s + a.atoRisk, 0) / breached.length : 0;
  const overall = clamp(maxAto * 0.55 + meanAto * 0.45);
  return { overall, band: riskBand(overall), breachedAccounts: breached.length, passwordsExposed: accounts.filter((a) => a.passwordExposed).length };
}

/* ── Restoration playbook ────────────────────────────────────────────────── */

export type StepPriority = "critical" | "high" | "standard";

export interface RestorationStep {
  step: number;
  action: string;
  priority: StepPriority;
}

/** Deterministic identity-restoration playbook (post-compromise recovery). */
export function restorationPlaybook(risk: IdentityRisk): RestorationStep[] {
  const urgent: StepPriority = risk.overall >= 50 ? "critical" : "high";
  return [
    { step: 1, action: "Rotate passwords on every exposed account and enforce 2FA / passkeys.", priority: urgent },
    { step: 2, action: "Place a credit freeze with all bureaus and review recent account activity.", priority: risk.overall >= 50 ? "critical" : "high" },
    { step: 3, action: "File an identity-theft report (IdentityTheft.gov) and obtain a recovery plan.", priority: "high" },
    { step: 4, action: "Enroll in continuous dark-web + credit monitoring with alerting.", priority: "standard" },
    { step: 5, action: "Audit account-recovery options; remove exposed recovery emails/phone numbers.", priority: "standard" },
  ];
}

/* ── Roll-up ─────────────────────────────────────────────────────────────── */

export interface IdentityOverview {
  accounts: number;
  breachedAccounts: number;
  passwordsExposed: number;
  identityRisk: number;
  band: RiskLevel;
  hygiene: number;
}

export function identityOverview(input: IdentityInput): IdentityOverview {
  const accounts = buildAccounts(input);
  const risk = identityRisk(accounts);
  const hygiene = passwordHygiene(accounts);
  return {
    accounts: accounts.length,
    breachedAccounts: risk.breachedAccounts,
    passwordsExposed: risk.passwordsExposed,
    identityRisk: risk.overall,
    band: risk.band,
    hygiene: hygiene.score,
  };
}
