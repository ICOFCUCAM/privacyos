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
  | "Breach response"
  | "Data privacy"
  | "Reputation & impersonation"
  | "Executive protection"
  | "Compliance"
  | "Continuous monitoring";

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

export const AUTOMATION_TEMPLATES: WorkflowTemplate[] = [
  {
    id: "critical-breach-response",
    name: "Critical breach response",
    description: "When a critical threat lands, rotate exposed credentials, alert the user, weigh legal duties, and file an incident record — end to end.",
    category: "Breach response",
    recommended: true,
    trigger: { kind: "threat_detected", minRisk: "critical" },
    impact: 38,
    steps: [
      agent("threat_intel", "Correlate the breach against known leak sources"),
      agent("security", "Rotate exposed credentials & force re-auth"),
      notify("Alert the user with a breach summary"),
      agent("legal", "Assess statutory breach-notification duties"),
      report("File an incident record"),
    ],
  },
  {
    id: "dark-web-credential-watch",
    name: "Dark-web credential watch",
    description: "High-risk credential exposure detected on the dark web triggers automatic correlation, rotation and notification.",
    category: "Breach response",
    trigger: { kind: "threat_detected", minRisk: "high" },
    impact: 26,
    steps: [
      agent("threat_intel", "Correlate the leaked credential set"),
      agent("security", "Rotate affected credentials"),
      notify("Notify the user of the credential exposure"),
    ],
  },
  {
    id: "data-broker-auto-removal",
    name: "Data-broker auto-removal",
    description: "Every medium-or-higher exposure found on a data broker is filed for removal, monitored for reappearance, and reported on.",
    category: "Data privacy",
    recommended: true,
    trigger: { kind: "exposure_found", minRisk: "medium" },
    impact: 22,
    steps: [
      agent("privacy", "File an opt-out / removal request with the broker"),
      agent("discovery", "Monitor for reappearance"),
      report("Log the removal in the compliance record"),
    ],
  },
  {
    id: "deepfake-takedown",
    name: "Deepfake takedown",
    description: "Verifies a suspected synthetic-media threat, issues a takedown notice after human sign-off, then monitors reputation impact.",
    category: "Reputation & impersonation",
    trigger: { kind: "threat_detected", minRisk: "high" },
    impact: 30,
    steps: [
      agent("deepfake", "Verify the media is synthetic"),
      gate("Approve takedown notice"),
      agent("legal", "Issue the takedown / DMCA notice"),
      agent("reputation", "Monitor downstream reputation impact"),
    ],
  },
  {
    id: "executive-impersonation-defense",
    name: "Executive impersonation defense",
    description: "Scans for impersonation of a protected executive, verifies it, escalates a takedown for approval, and notifies the principal.",
    category: "Executive protection",
    recommended: true,
    trigger: { kind: "threat_detected", minRisk: "high" },
    impact: 34,
    steps: [
      agent("discovery", "Sweep for impersonating accounts & profiles"),
      agent("deepfake", "Verify impersonation vs. legitimate presence"),
      gate("Approve takedown action"),
      agent("legal", "File the impersonation takedown"),
      notify("Brief the executive protection lead"),
    ],
  },
  {
    id: "score-guardrail",
    name: "Risk-score guardrail",
    description: "Whenever overall risk crosses a threshold, the orchestrator triages the top exposures, remediates what it can, and reports the delta.",
    category: "Continuous monitoring",
    trigger: { kind: "score_above", threshold: 70 },
    impact: 18,
    steps: [
      agent("orchestrator", "Triage the highest-risk findings"),
      agent("privacy", "Remediate auto-fixable exposures"),
      report("Report the score change & residual risk"),
    ],
  },
  {
    id: "vendor-risk-escalation",
    name: "Third-party risk escalation",
    description: "A high-risk vendor finding is assessed, held at a decision gate, and escalated to incident response when warranted.",
    category: "Continuous monitoring",
    trigger: { kind: "exposure_found", minRisk: "high" },
    impact: 16,
    steps: [
      agent("vendor", "Assess the third-party exposure"),
      gate("Escalate to incident response?"),
      agent("incident", "Open and drive an escalation"),
    ],
  },
  {
    id: "compliance-evidence-pack",
    name: "Compliance evidence pack",
    description: "On demand, gather the evidence and generate the GDPR/CCPA/SOC 2/ISO 27001 record set for an audit or regulator request.",
    category: "Compliance",
    trigger: { kind: "manual" },
    impact: 0,
    steps: [
      agent("compliance", "Gather GDPR / CCPA / SOC 2 / ISO 27001 evidence"),
      report("Generate the audit-ready compliance pack"),
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
  "Breach response", "Data privacy", "Reputation & impersonation",
  "Executive protection", "Compliance", "Continuous monitoring",
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
