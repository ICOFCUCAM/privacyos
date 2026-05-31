/**
 * Enterprise compliance & SLA posture.
 *
 * Pure, unit-tested model of the artifacts enterprise procurement asks for: a
 * SOC 2 Trust Service Criteria control map (with implemented/partial/planned
 * status), detection SLA attainment (MTTD/MTTR and breach rates), and a blended
 * readiness score. Control statuses are tied to real platform capabilities
 * (RLS, RBAC, audit log, encryption, automation) so the posture reflects what
 * the product actually does rather than aspirational claims.
 */

export type TrustCriterion = "security" | "availability" | "confidentiality" | "processing_integrity" | "privacy";
export type ControlStatus = "implemented" | "partial" | "planned";

export interface Control {
  id: string;
  criterion: TrustCriterion;
  name: string;
  description: string;
  status: ControlStatus;
  /** The platform capability that evidences this control. */
  evidence: string;
}

export const CRITERION_LABEL: Record<TrustCriterion, string> = {
  security: "Security",
  availability: "Availability",
  confidentiality: "Confidentiality",
  processing_integrity: "Processing Integrity",
  privacy: "Privacy",
};

/** The SOC 2 control map, grounded in shipped platform capabilities. */
export const CONTROLS: Control[] = [
  { id: "CC6.1", criterion: "security", name: "Logical access controls", description: "Role-based access enforced for every tenant and resource.", status: "implemented", evidence: "RBAC + org roles (org_role_for, SECURITY DEFINER)" },
  { id: "CC6.2", criterion: "security", name: "Tenant isolation", description: "Row-Level Security isolates each customer's data.", status: "implemented", evidence: "Postgres RLS on all tables" },
  { id: "CC6.6", criterion: "security", name: "Encryption in transit & at rest", description: "TLS in transit; encrypted storage at rest.", status: "implemented", evidence: "Supabase managed encryption + HTTPS" },
  { id: "CC7.2", criterion: "security", name: "Threat detection & monitoring", description: "Continuous monitoring across breach, dark-web and synthetic-media sources.", status: "implemented", evidence: "8-agent fleet + 24/7 scheduler" },
  { id: "CC7.3", criterion: "security", name: "Incident response", description: "Automated response playbooks with human approval gates.", status: "implemented", evidence: "Response playbook engine" },
  { id: "CC4.1", criterion: "security", name: "Continuous control monitoring", description: "Append-only audit trail of every action.", status: "implemented", evidence: "Append-only audit_logs" },
  { id: "A1.2", criterion: "availability", name: "Resilient processing", description: "Isolated agent failures; fail-soft data layer.", status: "implemented", evidence: "Concurrent orchestrator with isolation" },
  { id: "A1.1", criterion: "availability", name: "Capacity & uptime monitoring", description: "Health and uptime instrumentation.", status: "partial", evidence: "System Health panel; formal SLO pending" },
  { id: "C1.1", criterion: "confidentiality", name: "Data classification", description: "Exposures classified by category and severity.", status: "implemented", evidence: "Exposure category + risk model" },
  { id: "C1.2", criterion: "confidentiality", name: "Data retention & disposal", description: "Removal workflows and erasure requests.", status: "implemented", evidence: "Broker removal + GDPR/CCPA engine" },
  { id: "PI1.2", criterion: "processing_integrity", name: "Deterministic scoring", description: "Auditable, unit-tested risk scoring.", status: "implemented", evidence: "Pure scoring library + tests" },
  { id: "PI1.4", criterion: "processing_integrity", name: "Detection accuracy tracking", description: "Precision/recall/F1 measured per detector.", status: "implemented", evidence: "Detection-accuracy metrics" },
  { id: "P1.1", criterion: "privacy", name: "Privacy notice & consent", description: "Privacy-first architecture and data-subject controls.", status: "implemented", evidence: "Privacy-first design; subject settings" },
  { id: "P4.2", criterion: "privacy", name: "Automated data-subject requests", description: "GDPR/CCPA erasure and access requests generated automatically.", status: "implemented", evidence: "Legal automation engine" },
  { id: "P6.1", criterion: "privacy", name: "Third-party risk management", description: "Vendor and partner risk assessed continuously.", status: "partial", evidence: "Third-party risk module; attestations pending" },
];

const STATUS_WEIGHT: Record<ControlStatus, number> = { implemented: 1, partial: 0.5, planned: 0 };

export interface CriterionPosture {
  criterion: TrustCriterion;
  label: string;
  total: number;
  implemented: number;
  partial: number;
  planned: number;
  /** Weighted coverage, 0–100. */
  coverage: number;
}

export function postureByCriterion(controls: Control[] = CONTROLS): CriterionPosture[] {
  const groups = new Map<TrustCriterion, Control[]>();
  for (const c of controls) {
    const list = groups.get(c.criterion) ?? [];
    list.push(c);
    groups.set(c.criterion, list);
  }
  return [...groups.entries()].map(([criterion, list]) => {
    const weight = list.reduce((s, c) => s + STATUS_WEIGHT[c.status], 0);
    return {
      criterion,
      label: CRITERION_LABEL[criterion],
      total: list.length,
      implemented: list.filter((c) => c.status === "implemented").length,
      partial: list.filter((c) => c.status === "partial").length,
      planned: list.filter((c) => c.status === "planned").length,
      coverage: Math.round((weight / list.length) * 1000) / 10,
    };
  });
}

export interface ReadinessSummary {
  totalControls: number;
  implemented: number;
  partial: number;
  planned: number;
  /** Blended readiness score across all controls, 0–100. */
  readiness: number;
}

export function readiness(controls: Control[] = CONTROLS): ReadinessSummary {
  const weight = controls.reduce((s, c) => s + STATUS_WEIGHT[c.status], 0);
  return {
    totalControls: controls.length,
    implemented: controls.filter((c) => c.status === "implemented").length,
    partial: controls.filter((c) => c.status === "partial").length,
    planned: controls.filter((c) => c.status === "planned").length,
    readiness: controls.length === 0 ? 0 : Math.round((weight / controls.length) * 1000) / 10,
  };
}

/* ── Detection SLAs ──────────────────────────────────────────────────────── */

export interface SlaTarget {
  name: string;
  /** Target value (minutes for MTTD/MTTR, percent for rates). */
  target: number;
  /** Actual attained value. */
  actual: number;
  unit: "min" | "hrs" | "pct";
  /** Whether higher is better (e.g. attainment %) or lower (e.g. MTTD). */
  higherIsBetter: boolean;
}

export interface SlaInput {
  /** Mean time to detect, minutes. */
  mttdMinutes: number;
  /** Mean time to respond, hours. */
  mttrHours: number;
  /** Share of threats auto-remediated, 0–100. */
  autoRemediationRate: number;
  /** Detection accuracy (blended F1), 0–100. */
  detectionAccuracy: number;
  /** Uptime percent, 0–100. */
  uptime: number;
}

export interface SlaReport {
  targets: (SlaTarget & { met: boolean })[];
  /** Share of SLA targets met, 0–100. */
  attainment: number;
}

const SLA_TARGETS: Omit<SlaTarget, "actual">[] = [
  { name: "Mean time to detect", target: 15, unit: "min", higherIsBetter: false },
  { name: "Mean time to respond", target: 4, unit: "hrs", higherIsBetter: false },
  { name: "Auto-remediation rate", target: 80, unit: "pct", higherIsBetter: true },
  { name: "Detection accuracy", target: 90, unit: "pct", higherIsBetter: true },
  { name: "Platform uptime", target: 99.9, unit: "pct", higherIsBetter: true },
];

export function slaReport(input: SlaInput): SlaReport {
  const actuals: Record<string, number> = {
    "Mean time to detect": input.mttdMinutes,
    "Mean time to respond": input.mttrHours,
    "Auto-remediation rate": input.autoRemediationRate,
    "Detection accuracy": input.detectionAccuracy,
    "Platform uptime": input.uptime,
  };
  const targets = SLA_TARGETS.map((t) => {
    const actual = actuals[t.name] ?? 0;
    const met = t.higherIsBetter ? actual >= t.target : actual <= t.target;
    return { ...t, actual, met };
  });
  const attainment = Math.round((targets.filter((t) => t.met).length / targets.length) * 1000) / 10;
  return { targets, attainment };
}
