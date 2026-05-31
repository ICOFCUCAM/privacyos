/**
 * Domain-risk remediation intelligence.
 *
 * Turns raw domain findings into a remediation register: a concrete fix action
 * and workflow per risk kind, a re-scan cadence, the owning function, and a
 * domain-security posture. Pure and unit-tested; derived from the domain risks.
 */

import type { RiskLevel } from "@/lib/types";
import type { Domain, DomainRisk, DomainRiskKind } from "@/lib/suite-types";

const RISK_RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };
const RISK_WEIGHT: Record<RiskLevel, number> = { low: 4, medium: 10, high: 20, critical: 32 };
const DAY = 86_400_000;

interface FixSpec {
  action: string;
  workflow: string[];
  cadenceDays: number;
  owner: string;
}

const FIX: Record<DomainRiskKind, FixSpec> = {
  typosquat: {
    action: "File a takedown / UDRP for the lookalike domain.",
    workflow: ["Document the lookalike & its content", "Submit registrar abuse report", "File UDRP if unresolved", "Monitor for re-registration"],
    cadenceDays: 7, owner: "Brand protection",
  },
  spoof_mx: {
    action: "Enforce SPF, DKIM and DMARC (p=reject).",
    workflow: ["Publish/repair SPF & DKIM", "Set DMARC to p=quarantine then p=reject", "Monitor DMARC aggregate reports"],
    cadenceDays: 14, owner: "Email security",
  },
  expired_cert: {
    action: "Renew the TLS certificate before expiry.",
    workflow: ["Renew & install the certificate", "Automate renewal (ACME)", "Verify chain & expiry monitoring"],
    cadenceDays: 30, owner: "Infrastructure",
  },
  phishing: {
    action: "Take down the phishing page & alert users.",
    workflow: ["Report to host & blocklists", "Notify affected users", "Rotate any exposed credentials"],
    cadenceDays: 3, owner: "Incident response",
  },
  dns_takeover: {
    action: "Remove the dangling DNS record / reclaim the resource.",
    workflow: ["Identify the dangling record", "Reclaim or delete the record", "Audit all DNS for other dangles"],
    cadenceDays: 7, owner: "Infrastructure",
  },
  exposed_subdomain: {
    action: "Restrict or decommission the exposed subdomain.",
    workflow: ["Confirm intended exposure", "Apply access controls or remove", "Add to continuous monitoring"],
    cadenceDays: 30, owner: "Infrastructure",
  },
};

export interface DomainRiskAssessment {
  risk: DomainRisk;
  action: string;
  workflow: string[];
  cadenceDays: number;
  owner: string;
  ageDays: number;
}

export function assessDomainRisk(r: DomainRisk, now = Date.now()): DomainRiskAssessment {
  const spec = FIX[r.kind];
  const ageDays = Math.max(0, Math.round((now - new Date(r.detectedAt).getTime()) / DAY));
  return { risk: r, action: spec.action, workflow: spec.workflow, cadenceDays: spec.cadenceDays, owner: spec.owner, ageDays };
}

export type DomainPostureLevel = "secure" | "elevated" | "critical";

export interface DomainPosture {
  monitoredDomains: number;
  openRisks: number;
  resolved: number;
  critical: number;
  byKind: { kind: DomainRiskKind; count: number }[];
  posture: number;
  postureLevel: DomainPostureLevel;
}

export function summarizeDomains(domains: Domain[], risks: DomainRisk[], now = Date.now()): DomainPosture {
  const open = risks.filter((r) => !r.resolved);
  const critical = open.filter((r) => r.riskLevel === "critical" || r.riskLevel === "high").length;
  const byKindMap = new Map<DomainRiskKind, number>();
  for (const r of open) byKindMap.set(r.kind, (byKindMap.get(r.kind) ?? 0) + 1);
  const byKind = [...byKindMap.entries()].map(([kind, count]) => ({ kind, count })).sort((a, b) => b.count - a.count);

  const load = open.reduce((s, r) => s + RISK_WEIGHT[r.riskLevel], 0);
  const posture = Math.max(0, Math.min(100, Math.round(100 - load - open.filter((r) => assessDomainRisk(r, now).ageDays > assessDomainRisk(r, now).cadenceDays).length * 5)));
  const postureLevel: DomainPostureLevel =
    open.some((r) => r.riskLevel === "critical") || posture < 45 ? "critical" : critical > 0 || posture < 75 ? "elevated" : "secure";

  return { monitoredDomains: domains.length, openRisks: open.length, resolved: risks.length - open.length, critical, byKind, posture, postureLevel };
}

/** Enrich + order the register: open first, highest-severity & oldest first. */
export function domainRegister(risks: DomainRisk[], now = Date.now()): DomainRiskAssessment[] {
  return risks
    .map((r) => assessDomainRisk(r, now))
    .sort(
      (a, b) =>
        Number(a.risk.resolved) - Number(b.risk.resolved) ||
        RISK_RANK[b.risk.riskLevel] - RISK_RANK[a.risk.riskLevel] ||
        b.ageDays - a.ageDays,
    );
}
