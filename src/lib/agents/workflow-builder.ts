/**
 * Workflow Builder model.
 *
 * A user-authored automation: a trigger condition plus an ordered list of steps
 * (each an agent action, a decision gate, a notification or a report). Pure,
 * serializable and unit-tested — the builder UI manipulates this model and a
 * server action persists it. Designed so a saved definition can later be
 * executed by the same orchestrator/playbook machinery.
 */

import type { AgentKind, RiskLevel, ThreatKind } from "@/lib/types";

export type TriggerKind = "threat_detected" | "exposure_found" | "score_above" | "manual";
export type StepType = "agent" | "decision" | "notify" | "report";

export interface WorkflowTrigger {
  kind: TriggerKind;
  /** Minimum risk to fire (threat/exposure triggers). */
  minRisk?: RiskLevel;
  /** Specific threat kind, when narrowing. */
  threatKind?: ThreatKind;
  /** Score threshold for score_above. */
  threshold?: number;
}

export interface WorkflowStepDef {
  id: string;
  type: StepType;
  /** Agent that runs an "agent" step. */
  agent?: AgentKind;
  /** Human-readable action label. */
  label: string;
  /** Decision steps pause for human approval. */
  requiresApproval?: boolean;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  trigger: WorkflowTrigger;
  steps: WorkflowStepDef[];
  enabled: boolean;
}

const RISK_LABEL: Record<RiskLevel, string> = { low: "Low", medium: "Medium", high: "High", critical: "Critical" };

/** Human description of a trigger, for the flow preview. */
export function describeTrigger(t: WorkflowTrigger): string {
  switch (t.kind) {
    case "threat_detected":
      return `Threat detected${t.threatKind ? ` (${t.threatKind.replace(/_/g, " ")})` : ""}${t.minRisk ? ` · ${RISK_LABEL[t.minRisk]}+` : ""}`;
    case "exposure_found":
      return `Exposure found${t.minRisk ? ` · ${RISK_LABEL[t.minRisk]}+` : ""}`;
    case "score_above":
      return `Risk score above ${t.threshold ?? 70}`;
    case "manual":
      return "Manual / on-demand";
  }
}

let seq = 0;
export function newStepId(): string {
  seq += 1;
  return `step-${Date.now().toString(36)}-${seq}`;
}

/* ── Pure editing operations (immutable) ─────────────────────────────────── */

export function addStep(def: WorkflowDefinition, step: WorkflowStepDef): WorkflowDefinition {
  return { ...def, steps: [...def.steps, step] };
}

export function removeStep(def: WorkflowDefinition, stepId: string): WorkflowDefinition {
  return { ...def, steps: def.steps.filter((s) => s.id !== stepId) };
}

/** Move a step up (dir -1) or down (dir +1), clamped. */
export function moveStep(def: WorkflowDefinition, stepId: string, dir: -1 | 1): WorkflowDefinition {
  const i = def.steps.findIndex((s) => s.id === stepId);
  if (i < 0) return def;
  const j = i + dir;
  if (j < 0 || j >= def.steps.length) return def;
  const steps = [...def.steps];
  [steps[i], steps[j]] = [steps[j], steps[i]];
  return { ...def, steps };
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/** Validate a definition before it can be saved/enabled. */
export function validateWorkflow(def: WorkflowDefinition): ValidationResult {
  const errors: string[] = [];
  if (!def.name.trim()) errors.push("Workflow needs a name.");
  if (def.steps.length === 0) errors.push("Add at least one step.");
  if (def.trigger.kind === "score_above" && (def.trigger.threshold ?? 0) <= 0) {
    errors.push("Score trigger needs a threshold above 0.");
  }
  for (const s of def.steps) {
    if (s.type === "agent" && !s.agent) errors.push(`Step "${s.label || "untitled"}" needs an agent.`);
  }
  return { valid: errors.length === 0, errors };
}

/** Linear flow labels for the preview: Trigger → step → step → … */
export function flowPreview(def: WorkflowDefinition): string[] {
  return [describeTrigger(def.trigger), ...def.steps.map((s) => s.label || s.type)];
}

/** A starter definition for a fresh builder session. */
export function emptyWorkflow(id = "draft"): WorkflowDefinition {
  return {
    id,
    name: "",
    trigger: { kind: "threat_detected", minRisk: "high" },
    steps: [],
    enabled: false,
  };
}
