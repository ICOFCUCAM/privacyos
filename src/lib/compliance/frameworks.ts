/**
 * Multi-framework compliance model.
 *
 * Beyond the SOC 2 Trust Service Criteria (see posture.ts), enterprise buyers
 * require coverage across several regulatory and certification frameworks. This
 * module defines each framework, its key requirements mapped to shipped platform
 * capabilities, and the continuous-monitoring tasks the Compliance Agent runs to
 * keep them in good standing. Pure and unit-tested — no IO.
 */

export type FrameworkId = "gdpr" | "ccpa" | "soc2" | "iso27001" | "hipaa" | "pci_dss";
export type RequirementStatus = "met" | "in_progress" | "gap";

export interface Requirement {
  id: string;
  title: string;
  /** How the platform satisfies (or will satisfy) this requirement. */
  evidence: string;
  status: RequirementStatus;
}

export interface Framework {
  id: FrameworkId;
  name: string;
  /** Short authority / jurisdiction label. */
  authority: string;
  summary: string;
  requirements: Requirement[];
}

export const FRAMEWORKS: Framework[] = [
  {
    id: "gdpr",
    name: "GDPR",
    authority: "EU 2016/679",
    summary: "EU data-protection regulation — lawful processing and data-subject rights.",
    requirements: [
      { id: "gdpr-15", title: "Right of access (Art. 15)", evidence: "Automated subject-access requests via the Legal engine.", status: "met" },
      { id: "gdpr-17", title: "Right to erasure (Art. 17)", evidence: "Broker opt-outs + auto-drafted erasure requests.", status: "met" },
      { id: "gdpr-30", title: "Records of processing (Art. 30)", evidence: "Append-only audit log of every data action.", status: "met" },
      { id: "gdpr-33", title: "Breach notification (Art. 33)", evidence: "Credential-breach playbook with 72h escalation.", status: "met" },
      { id: "gdpr-35", title: "Data-protection impact assessment (Art. 35)", evidence: "Risk scoring per subject; DPIA template pending.", status: "in_progress" },
    ],
  },
  {
    id: "ccpa",
    name: "CCPA / CPRA",
    authority: "California Civil Code",
    summary: "California consumer-privacy rights — disclosure, deletion and opt-out.",
    requirements: [
      { id: "ccpa-right-know", title: "Right to know", evidence: "Exposure inventory enumerates collected/sold data.", status: "met" },
      { id: "ccpa-right-delete", title: "Right to delete", evidence: "Automated deletion requests across data brokers.", status: "met" },
      { id: "ccpa-opt-out", title: "Right to opt out of sale", evidence: "Broker opt-out automation with re-checks.", status: "met" },
      { id: "ccpa-non-discrim", title: "Non-discrimination", evidence: "No service degradation for privacy requests.", status: "met" },
    ],
  },
  {
    id: "soc2",
    name: "SOC 2 Type II",
    authority: "AICPA TSC",
    summary: "Trust Service Criteria across security, availability, confidentiality, integrity and privacy.",
    requirements: [
      { id: "soc2-security", title: "Security (common criteria)", evidence: "RBAC, RLS tenant isolation, encryption, audit log.", status: "met" },
      { id: "soc2-availability", title: "Availability", evidence: "Fail-soft data layer; formal SLO instrumentation pending.", status: "in_progress" },
      { id: "soc2-confidentiality", title: "Confidentiality", evidence: "Data classification + retention/disposal workflows.", status: "met" },
      { id: "soc2-integrity", title: "Processing integrity", evidence: "Deterministic, unit-tested scoring & detection metrics.", status: "met" },
      { id: "soc2-privacy", title: "Privacy", evidence: "Privacy-first architecture; automated DSARs.", status: "met" },
    ],
  },
  {
    id: "iso27001",
    name: "ISO 27001",
    authority: "ISO/IEC 27001:2022",
    summary: "Information-security management system (ISMS) controls.",
    requirements: [
      { id: "iso-a5", title: "A.5 Organizational controls", evidence: "Access policy, RBAC roles and onboarding governance.", status: "met" },
      { id: "iso-a8", title: "A.8 Asset & access management", evidence: "Tenant isolation, least-privilege access enforcement.", status: "met" },
      { id: "iso-a12", title: "A.12 Operations security", evidence: "Continuous monitoring + append-only logging.", status: "met" },
      { id: "iso-a16", title: "A.16 Incident management", evidence: "Response playbooks with escalation gates.", status: "met" },
      { id: "iso-a5-risk", title: "Risk assessment & treatment", evidence: "Six-axis risk scoring; formal risk register pending.", status: "in_progress" },
    ],
  },
  {
    id: "hipaa",
    name: "HIPAA",
    authority: "US 45 CFR",
    summary: "US health-data safeguards (administrative, physical, technical).",
    requirements: [
      { id: "hipaa-access", title: "Access control (§164.312)", evidence: "RBAC + RLS enforce minimum-necessary access.", status: "met" },
      { id: "hipaa-audit", title: "Audit controls", evidence: "Append-only audit log of PHI-adjacent actions.", status: "met" },
      { id: "hipaa-baa", title: "Business Associate Agreements", evidence: "DPA/BAA process; signed templates pending.", status: "in_progress" },
    ],
  },
  {
    id: "pci_dss",
    name: "PCI-DSS",
    authority: "PCI SSC v4.0",
    summary: "Payment-card data security standard.",
    requirements: [
      { id: "pci-no-store", title: "Do not store cardholder data", evidence: "Payments delegated to Stripe; no PAN stored.", status: "met" },
      { id: "pci-monitor", title: "Monitor & test networks", evidence: "Continuous monitoring + credential-leak detection.", status: "met" },
      { id: "pci-access", title: "Restrict access", evidence: "RBAC, RLS and least-privilege enforcement.", status: "met" },
    ],
  },
];

const STATUS_WEIGHT: Record<RequirementStatus, number> = { met: 1, in_progress: 0.5, gap: 0 };
const pct = (n: number) => Math.round(n * 1000) / 10;

export interface FrameworkCoverage {
  id: FrameworkId;
  name: string;
  authority: string;
  total: number;
  met: number;
  inProgress: number;
  gaps: number;
  /** Weighted coverage, 0–100. */
  coverage: number;
  /** "Compliant" ≥ 90, "On track" ≥ 70, else "At risk". */
  standing: "Compliant" | "On track" | "At risk";
}

function standingFor(coverage: number): FrameworkCoverage["standing"] {
  if (coverage >= 90) return "Compliant";
  if (coverage >= 70) return "On track";
  return "At risk";
}

export function frameworkCoverage(fw: Framework): FrameworkCoverage {
  const weight = fw.requirements.reduce((s, r) => s + STATUS_WEIGHT[r.status], 0);
  const coverage = fw.requirements.length === 0 ? 0 : pct(weight / fw.requirements.length);
  return {
    id: fw.id,
    name: fw.name,
    authority: fw.authority,
    total: fw.requirements.length,
    met: fw.requirements.filter((r) => r.status === "met").length,
    inProgress: fw.requirements.filter((r) => r.status === "in_progress").length,
    gaps: fw.requirements.filter((r) => r.status === "gap").length,
    coverage,
    standing: standingFor(coverage),
  };
}

export function allFrameworkCoverage(frameworks: Framework[] = FRAMEWORKS): FrameworkCoverage[] {
  return frameworks.map(frameworkCoverage);
}

/** Blended coverage across every framework, weighted by requirement count. */
export function overallFrameworkCoverage(frameworks: Framework[] = FRAMEWORKS): number {
  let weighted = 0;
  let total = 0;
  for (const fw of frameworks) {
    const c = frameworkCoverage(fw);
    weighted += c.coverage * fw.requirements.length;
    total += fw.requirements.length;
  }
  return total === 0 ? 0 : Math.round((weighted / total) * 10) / 10;
}

/* ── Continuous-monitoring tasks the Compliance Agent executes ───────────── */

export interface ComplianceTask {
  framework: FrameworkId;
  action: string;
  cadence: "continuous" | "daily" | "weekly" | "monthly" | "quarterly";
}

/**
 * The standing checks the Compliance Agent runs to keep frameworks current.
 * These are what the agent "executes" each cycle — control checks, evidence
 * collection, and drift detection across every framework.
 */
export const COMPLIANCE_TASKS: ComplianceTask[] = [
  { framework: "gdpr", action: "Verify DSAR turnaround within statutory window", cadence: "daily" },
  { framework: "gdpr", action: "Confirm breach-notification clock on new critical leaks", cadence: "continuous" },
  { framework: "ccpa", action: "Reconcile opt-out requests against broker re-checks", cadence: "weekly" },
  { framework: "soc2", action: "Sample audit-log integrity & access-control changes", cadence: "daily" },
  { framework: "soc2", action: "Check SLA attainment (MTTD/MTTR/uptime) vs targets", cadence: "continuous" },
  { framework: "iso27001", action: "Review ISMS control drift & risk-register updates", cadence: "weekly" },
  { framework: "hipaa", action: "Audit minimum-necessary access to sensitive records", cadence: "daily" },
  { framework: "pci_dss", action: "Confirm no cardholder data persisted outside Stripe", cadence: "continuous" },
];

export interface ComplianceExecution {
  tasksRun: number;
  frameworksMonitored: number;
  /** Requirements still in progress or gapped across all frameworks. */
  openItems: number;
  overallCoverage: number;
}

/** Summarize one Compliance Agent monitoring cycle. */
export function runComplianceCycle(frameworks: Framework[] = FRAMEWORKS): ComplianceExecution {
  const coverage = allFrameworkCoverage(frameworks);
  return {
    tasksRun: COMPLIANCE_TASKS.length,
    frameworksMonitored: frameworks.length,
    openItems: coverage.reduce((s, c) => s + c.inProgress + c.gaps, 0),
    overallCoverage: overallFrameworkCoverage(frameworks),
  };
}
