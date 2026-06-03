/**
 * Workforce (employee + credential) risk intelligence.
 *
 * Joins employee exposures and corporate credential leaks into a per-employee
 * risk profile keyed by email, with the remediation actions a security team
 * would take (credential rotation, MFA enforcement, broker opt-out) and a
 * workforce-wide posture. Pure and unit-tested; derived from the suite data.
 */

import type { RiskLevel } from "@/lib/types";
import type { CredentialLeak, EmployeeExposure } from "@/lib/suite-types";

const RISK_RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };
const RISK_WEIGHT: Record<RiskLevel, number> = { low: 4, medium: 10, high: 20, critical: 32 };

export interface EmployeeRisk {
  email: string;
  name?: string;
  exposures: EmployeeExposure[];
  leaks: CredentialLeak[];
  highestRisk: RiskLevel;
  /** Total breached records across this employee's leaks. */
  exposedRecords: number;
  actions: string[];
  priority: number;
}

function highestOf(levels: RiskLevel[]): RiskLevel {
  return levels.reduce<RiskLevel>((a, b) => (RISK_RANK[b] > RISK_RANK[a] ? b : a), "low");
}

function actionsFor(exposures: EmployeeExposure[], leaks: CredentialLeak[]): string[] {
  const actions: string[] = [];
  if (leaks.length > 0) {
    actions.push("Force password rotation & revoke active sessions.");
    actions.push("Enforce phishing-resistant MFA (hardware key).");
  }
  for (const e of exposures) {
    const t = e.exposureType.toLowerCase();
    if (/broker/.test(t)) actions.push("File a data-broker opt-out for the exposed listing.");
    if (/inbox|shared/.test(t)) actions.push("Lock down the shared inbox & rotate its access.");
    if (/credential/.test(t) && leaks.length === 0) actions.push("Force password rotation & enable MFA.");
  }
  if (actions.length === 0) actions.push("Continue monitoring — no action required.");
  return [...new Set(actions)];
}

/** One risk profile per employee email, highest-risk first. */
export function buildWorkforce(exposures: EmployeeExposure[], leaks: CredentialLeak[]): EmployeeRisk[] {
  const byEmail = new Map<string, EmployeeRisk>();
  const ensure = (email: string, name?: string): EmployeeRisk => {
    const key = email.toLowerCase();
    let r = byEmail.get(key);
    if (!r) {
      r = { email, name, exposures: [], leaks: [], highestRisk: "low", exposedRecords: 0, actions: [], priority: 0 };
      byEmail.set(key, r);
    }
    if (!r.name && name) r.name = name;
    return r;
  };

  for (const e of exposures) ensure(e.employeeEmail, e.employeeName).exposures.push(e);
  for (const l of leaks) ensure(l.account).leaks.push(l);

  for (const r of byEmail.values()) {
    const levels = [...r.exposures.map((e) => e.riskLevel), ...r.leaks.map((l) => l.riskLevel)];
    r.highestRisk = levels.length ? highestOf(levels) : "low";
    r.exposedRecords = r.leaks.reduce((s, l) => s + l.pwnCount, 0);
    r.actions = actionsFor(r.exposures, r.leaks);
    r.priority = (RISK_RANK[r.highestRisk] + 1) * 10 + r.leaks.length * 4 + r.exposures.length * 2;
  }

  return [...byEmail.values()].sort(
    (a, b) => RISK_RANK[b.highestRisk] - RISK_RANK[a.highestRisk] || b.priority - a.priority,
  );
}

export type WorkforcePostureLevel = "secure" | "elevated" | "critical";

export interface WorkforcePosture {
  employeesAffected: number;
  critical: number;
  credentialLeaks: number;
  /** Total breached records across the workforce. */
  exposedRecords: number;
  /** 0–100, higher = better protected. */
  posture: number;
  postureLevel: WorkforcePostureLevel;
}

export function summarizeWorkforce(exposures: EmployeeExposure[], leaks: CredentialLeak[]): WorkforcePosture {
  const people = buildWorkforce(exposures, leaks);
  const critical = people.filter((p) => p.highestRisk === "critical").length;
  const exposedRecords = leaks.reduce((s, l) => s + l.pwnCount, 0);
  const load = people.reduce((s, p) => s + RISK_WEIGHT[p.highestRisk], 0);
  const posture = people.length === 0 ? 100 : Math.max(0, Math.min(100, Math.round(100 - load / Math.max(1, people.length) - critical * 6)));
  const postureLevel: WorkforcePostureLevel = critical > 0 || posture < 45 ? "critical" : people.some((p) => p.highestRisk === "high") || posture < 72 ? "elevated" : "secure";
  return { employeesAffected: people.length, critical, credentialLeaks: leaks.length, exposedRecords, posture, postureLevel };
}

export interface RotationStep {
  step: number;
  action: string;
}

/** The credential-rotation playbook applied to leaked workforce accounts. */
export function rotationWorkflow(): RotationStep[] {
  return [
    { step: 1, action: "Identify all accounts in the leaked credential set" },
    { step: 2, action: "Force password reset & invalidate active sessions" },
    { step: 3, action: "Enforce phishing-resistant MFA on affected accounts" },
    { step: 4, action: "Check for reuse across corporate SSO & SaaS" },
    { step: 5, action: "Monitor for follow-on account-takeover attempts" },
  ];
}
