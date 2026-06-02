/**
 * Automation templates.
 *
 * A curated catalog of ready-to-run workflow packs. Each template is a complete,
 * best-practice workflow (trigger + ordered steps) that a user can instantiate
 * into their own editable definition with one click. Pure and unit-tested:
 * every template round-trips through the same model the builder uses and
 * validates clean, so "Use template" always produces a working draft.
 */

import type { AgentKind } from "@/lib/types";
import {
  newStepId, type WorkflowDefinition, type WorkflowStepDef, type WorkflowTrigger,
} from "./workflow-builder";

export type TemplateCategory =
  | "Security"
  | "Privacy"
  | "Reputation"
  | "Executive"
  | "Business";

/** A template step is a builder step without an id — ids are minted on use. */
export type TemplateStep = Omit<WorkflowStepDef, "id">;

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  /** Surfaced first in the catalog. */
  recommended?: boolean;
  trigger: WorkflowTrigger;
  steps: TemplateStep[];
  /** Estimated risk-score reduction when this runs (for the catalog card). */
  impact: number;
}

const agent = (a: AgentKind, label: string): TemplateStep => ({ type: "agent", agent: a, label });
const gate = (label: string, requiresApproval = true): TemplateStep => ({ type: "decision", label, requiresApproval });
const notify = (label: string): TemplateStep => ({ type: "notify", label });
const report = (label: string): TemplateStep => ({ type: "report", label });
const openCase = (label: string): TemplateStep => ({ type: "case", label });
const takedown = (label: string): TemplateStep => ({ type: "takedown", label });
const onlyIf = (label: string, condition: NonNullable<WorkflowStepDef["condition"]>, onFalse: "stop" | "continue" = "stop"): TemplateStep =>
  ({ type: "condition", label, condition, onFalse });

export const AUTOMATION_TEMPLATES: WorkflowTemplate[] = [
  /* ── Security ──────────────────────────────────────────────────────────── */
  {
    id: "credential-leak-response",
    name: "Credential Leak Response",
    description: "A leaked credential triggers correlation, forced rotation + session revocation, a breach-response case and a user alert.",
    category: "Security",
    recommended: true,
    trigger: { kind: "threat_detected", minRisk: "high", threatKind: "credential_leak" },
    impact: 28,
    steps: [
      agent("threat_intel", "Correlate the leaked credential set"),
      onlyIf("Only if high+ severity", { field: "risk", op: "gte", value: "high" }),
      agent("security", "Force-rotate credentials & revoke sessions"),
      notify("Alert the user to the credential leak"),
      openCase("Open a breach-response case"),
    ],
  },
  {
    id: "breach-response",
    name: "Breach Response",
    description: "When a critical breach lands, correlate sources, rotate credentials, weigh legal duties, open a case and file an incident record.",
    category: "Security",
    recommended: true,
    trigger: { kind: "incident_raised", minRisk: "critical" },
    impact: 38,
    steps: [
      agent("threat_intel", "Correlate the breach against known leak sources"),
      agent("security", "Rotate exposed credentials & force re-auth"),
      notify("Alert the user with a breach summary"),
      agent("legal", "Assess statutory breach-notification duties"),
      openCase("Open a breach-response case"),
      report("File an incident record"),
    ],
  },
  {
    id: "dark-web-monitoring",
    name: "Dark Web Monitoring",
    description: "On a schedule, scan dark-web sources for the principal; on a match, alert and open a case to action the exposure.",
    category: "Security",
    trigger: { kind: "scheduled", cadence: "every 6h" },
    impact: 20,
    steps: [
      agent("threat_intel", "Scan dark-web sources for the principal"),
      onlyIf("Only if a match is found", { field: "risk", op: "gte", value: "medium" }),
      notify("Alert on the dark-web exposure"),
      openCase("Open a case to action the exposure"),
    ],
  },

  /* ── Privacy ───────────────────────────────────────────────────────────── */
  {
    id: "broker-removal",
    name: "Broker Removal",
    description: "Every medium-or-higher broker exposure is filed for removal, monitored for reappearance, and logged for compliance.",
    category: "Privacy",
    recommended: true,
    trigger: { kind: "exposure_found", minRisk: "medium" },
    impact: 22,
    steps: [
      takedown("File a broker opt-out / removal request"),
      agent("discovery", "Monitor for reappearance"),
      report("Log the removal in the compliance record"),
    ],
  },
  {
    id: "identity-protection",
    name: "Identity Protection",
    description: "Hardens the principal's identity: enforce 2FA/passkeys, rotate credentials, strip identity records from people-search, and record it.",
    category: "Privacy",
    trigger: { kind: "threat_detected", minRisk: "high" },
    impact: 24,
    steps: [
      agent("security", "Enforce 2FA / passkeys & rotate credentials"),
      takedown("Remove identity records from people-search"),
      notify("Notify the user of identity hardening"),
      report("Record the identity-protection actions"),
    ],
  },

  /* ── Reputation ────────────────────────────────────────────────────────── */
  {
    id: "reputation-recovery",
    name: "Reputation Recovery",
    description: "Negative coverage triggers sentiment analysis, a recovery case, a suppression / positive-content plan, and rank+sentiment tracking.",
    category: "Reputation",
    recommended: true,
    trigger: { kind: "threat_detected", minRisk: "medium", threatKind: "negative_press" },
    impact: 26,
    steps: [
      agent("reputation", "Analyze the negative coverage & sentiment"),
      openCase("Open a reputation-recovery case"),
      agent("reputation", "Run the suppression & positive-content plan"),
      report("Report rank & sentiment recovery"),
    ],
  },
  {
    id: "seo-recovery",
    name: "SEO Recovery",
    description: "Audits page-one search results, promotes owned content to suppress negatives, and tracks keyword & rank recovery.",
    category: "Reputation",
    trigger: { kind: "manual" },
    impact: 18,
    steps: [
      agent("reputation", "Audit page-one search results"),
      agent("reputation", "Publish & promote owned content to suppress negatives"),
      report("Track keyword & rank recovery"),
    ],
  },

  /* ── Executive ─────────────────────────────────────────────────────────── */
  {
    id: "executive-protection-sweep",
    name: "Executive Protection Sweep",
    description: "Daily: sweep all layers, recompute the Executive Risk Score, brief the protection lead, and open a case if risk is critical.",
    category: "Executive",
    recommended: true,
    trigger: { kind: "scheduled", cadence: "daily" },
    impact: 30,
    steps: [
      agent("discovery", "Sweep all layers for the principal"),
      agent("executive", "Recompute the Executive Risk Score & indices"),
      notify("Brief the protection lead on the sweep"),
      onlyIf("Only if risk is critical", { field: "risk", op: "gte", value: "critical" }),
      openCase("Open an executive-protection case"),
    ],
  },
  {
    id: "family-protection-sweep",
    name: "Family Protection Sweep",
    description: "Weekly: sweep the family roster's footprint, opt at-risk relatives out of people-search, and brief on family exposure & child safety.",
    category: "Executive",
    trigger: { kind: "scheduled", cadence: "weekly" },
    impact: 22,
    steps: [
      agent("discovery", "Sweep the family roster's footprint"),
      takedown("Opt at-risk relatives out of people-search"),
      notify("Brief on family exposure & child safety"),
    ],
  },
  {
    id: "critical-escalation",
    name: "Critical Escalation",
    description: "The escalation engine: a critical threat opens a case, assigns the Incident Response Agent, notifies the executive, and produces a board report — end to end.",
    category: "Executive",
    recommended: true,
    trigger: { kind: "threat_detected", minRisk: "critical" },
    impact: 40,
    steps: [
      openCase("Open Case"),
      agent("incident", "Assign Incident Agent"),
      notify("Notify Executive"),
      report("Create Board Report"),
    ],
  },

  /* ── Business ──────────────────────────────────────────────────────────── */
  {
    id: "vendor-risk-assessment",
    name: "Vendor Risk Assessment",
    description: "Assesses the third-party portfolio; for a high-risk vendor, holds a decision gate and escalates to incident response.",
    category: "Business",
    trigger: { kind: "scheduled", cadence: "weekly" },
    impact: 16,
    steps: [
      agent("vendor", "Assess the third-party / vendor portfolio"),
      onlyIf("Only if a vendor is high-risk", { field: "risk", op: "gte", value: "high" }),
      gate("Escalate to incident response?"),
      agent("incident", "Open and drive an escalation"),
    ],
  },
  {
    id: "employee-exposure-response",
    name: "Employee Exposure Response",
    description: "A workforce exposure triggers a credential check, broker removal of employee data, a security-lead alert and a logged response.",
    category: "Business",
    trigger: { kind: "exposure_found", minRisk: "high" },
    impact: 18,
    steps: [
      agent("security", "Check exposed employee credentials"),
      takedown("Remove employee data from brokers"),
      notify("Notify the security lead of workforce exposure"),
      report("Log the workforce-exposure response"),
    ],
  },
];

/** Convert a template into a fresh, editable draft definition (new step ids). */
export function templateToDefinition(t: WorkflowTemplate): WorkflowDefinition {
  return {
    id: "draft",
    name: t.name,
    trigger: { ...t.trigger },
    steps: t.steps.map((s) => ({ ...s, id: newStepId() })),
    enabled: false,
  };
}

/** Distinct agents involved in a template's agent steps, in order. */
export function templateAgents(t: WorkflowTemplate): AgentKind[] {
  const seen = new Set<AgentKind>();
  const out: AgentKind[] = [];
  for (const s of t.steps) {
    if (s.type === "agent" && s.agent && !seen.has(s.agent)) {
      seen.add(s.agent);
      out.push(s.agent);
    }
  }
  return out;
}

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  "Security", "Privacy", "Reputation", "Executive", "Business",
];

/** Group templates by category, recommended first within each group. */
export function groupTemplates(templates = AUTOMATION_TEMPLATES): { category: TemplateCategory; items: WorkflowTemplate[] }[] {
  return TEMPLATE_CATEGORIES
    .map((category) => ({
      category,
      items: templates
        .filter((t) => t.category === category)
        .sort((a, b) => Number(!!b.recommended) - Number(!!a.recommended)),
    }))
    .filter((g) => g.items.length > 0);
}

export function findTemplate(id: string): WorkflowTemplate | undefined {
  return AUTOMATION_TEMPLATES.find((t) => t.id === id);
}

export interface TemplateCatalogStats {
  total: number;
  recommended: number;
  categories: number;
  /** Mean estimated impact across templates that reduce risk. */
  avgImpact: number;
}

export function templateStats(templates = AUTOMATION_TEMPLATES): TemplateCatalogStats {
  const impactful = templates.filter((t) => t.impact > 0);
  const avgImpact = impactful.length === 0
    ? 0
    : Math.round(impactful.reduce((s, t) => s + t.impact, 0) / impactful.length);
  return {
    total: templates.length,
    recommended: templates.filter((t) => t.recommended).length,
    categories: new Set(templates.map((t) => t.category)).size,
    avgImpact,
  };
}
