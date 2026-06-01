/**
 * Workflow Builder model — the visual automation platform.
 *
 * A user-authored automation: a trigger plus an ordered list of blocks (agent
 * actions, conditional logic, human approval, notifications, case/takedown
 * actions, integrations and waits). Pure, serializable and unit-tested — the
 * builder UI manipulates this model, a server action persists it, and the same
 * orchestrator/playbook machinery executes it. `simulateRun` dry-runs a
 * definition against a sample event so authors can test before enabling.
 */

import type { AgentKind, RiskLevel, ThreatKind } from "@/lib/types";

export type TriggerKind =
  | "threat_detected" | "exposure_found" | "score_above"
  | "case_opened" | "incident_raised" | "scheduled" | "manual";

export type StepType =
  | "agent" | "condition" | "decision" | "notify"
  | "case" | "takedown" | "report" | "webhook" | "wait";

export interface WorkflowTrigger {
  kind: TriggerKind;
  /** Minimum risk to fire (threat/exposure triggers). */
  minRisk?: RiskLevel;
  /** Specific threat kind, when narrowing. */
  threatKind?: ThreatKind;
  /** Score threshold for score_above. */
  threshold?: number;
  /** Cadence for scheduled triggers, e.g. "every 6h", "daily". */
  cadence?: string;
}

export type ConditionField = "risk" | "kind" | "score" | "source";
export type ConditionOp = "eq" | "gte" | "contains";

export interface StepCondition {
  field: ConditionField;
  op: ConditionOp;
  value: string;
}

export interface WorkflowStepDef {
  id: string;
  type: StepType;
  label: string;
  /** Agent that runs an "agent" step. */
  agent?: AgentKind;
  /** Decision steps pause for human approval. */
  requiresApproval?: boolean;
  /** Predicate for a "condition" step. */
  condition?: StepCondition;
  /** What a failed condition does: stop the run, or continue anyway. */
  onFalse?: "stop" | "continue";
  /** Delay for a "wait" step, in hours. */
  delayHours?: number;
  /** Endpoint for a "webhook" step. */
  url?: string;
  /** Case/takedown target descriptor. */
  target?: string;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  trigger: WorkflowTrigger;
  steps: WorkflowStepDef[];
  enabled: boolean;
}

/* ── Block catalog (drives the builder palette) ──────────────────────────── */

export type BlockCategory = "action" | "logic" | "human" | "integration";

export const STEP_CATALOG: Record<StepType, { label: string; category: BlockCategory; description: string }> = {
  agent: { label: "Agent action", category: "action", description: "An agent executes a task" },
  case: { label: "Open case", category: "action", description: "Open a tracked case for the responder" },
  takedown: { label: "File takedown", category: "action", description: "Route a takedown / opt-out request" },
  report: { label: "Generate report", category: "action", description: "Produce a print-ready report" },
  notify: { label: "Notify", category: "action", description: "Send a notification / alert" },
  condition: { label: "Condition", category: "logic", description: "Continue only if a predicate holds" },
  wait: { label: "Wait", category: "logic", description: "Pause for a delay before the next block" },
  decision: { label: "Human approval", category: "human", description: "Pause for a human to approve" },
  webhook: { label: "Webhook", category: "integration", description: "Call an external system" },
};

export const TRIGGER_LABEL: Record<TriggerKind, string> = {
  threat_detected: "Threat detected",
  exposure_found: "Exposure found",
  score_above: "Risk score above…",
  case_opened: "Case opened",
  incident_raised: "Incident raised",
  scheduled: "On a schedule",
  manual: "Manual / on-demand",
};

const RISK_LABEL: Record<RiskLevel, string> = { low: "Low", medium: "Medium", high: "High", critical: "Critical" };
const RISK_RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };

/** Human description of a trigger, for the flow preview. */
export function describeTrigger(t: WorkflowTrigger): string {
  switch (t.kind) {
    case "threat_detected":
      return `Threat detected${t.threatKind ? ` (${t.threatKind.replace(/_/g, " ")})` : ""}${t.minRisk ? ` · ${RISK_LABEL[t.minRisk]}+` : ""}`;
    case "exposure_found":
      return `Exposure found${t.minRisk ? ` · ${RISK_LABEL[t.minRisk]}+` : ""}`;
    case "score_above":
      return `Risk score above ${t.threshold ?? 70}`;
    case "case_opened":
      return "Case opened";
    case "incident_raised":
      return `Incident raised${t.minRisk ? ` · ${RISK_LABEL[t.minRisk]}+` : ""}`;
    case "scheduled":
      return `On a schedule (${t.cadence ?? "daily"})`;
    case "manual":
      return "Manual / on-demand";
  }
}

const OP_LABEL: Record<ConditionOp, string> = { eq: "is", gte: "≥", contains: "contains" };

/** One-line description of a step, for previews and the graph. */
export function describeStep(s: WorkflowStepDef): string {
  if (s.label?.trim()) return s.label.trim();
  switch (s.type) {
    case "agent": return `${s.agent ?? "agent"} action`;
    case "condition": return s.condition ? `If ${s.condition.field} ${OP_LABEL[s.condition.op]} ${s.condition.value}` : "Condition";
    case "wait": return `Wait ${s.delayHours ?? 0}h`;
    case "webhook": return `Webhook → ${s.url || "endpoint"}`;
    default: return STEP_CATALOG[s.type].label;
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
  if (def.steps.length === 0) errors.push("Add at least one block.");
  if (def.trigger.kind === "score_above" && (def.trigger.threshold ?? 0) <= 0) {
    errors.push("Score trigger needs a threshold above 0.");
  }
  for (const s of def.steps) {
    const name = s.label || STEP_CATALOG[s.type].label;
    if (s.type === "agent" && !s.agent) errors.push(`Block "${name}" needs an agent.`);
    if (s.type === "condition" && (!s.condition || !s.condition.value.trim())) errors.push(`Block "${name}" needs a condition.`);
    if (s.type === "webhook" && !s.url?.trim()) errors.push(`Block "${name}" needs a webhook URL.`);
    if (s.type === "wait" && (s.delayHours ?? 0) <= 0) errors.push(`Block "${name}" needs a delay above 0.`);
  }
  return { valid: errors.length === 0, errors };
}

/** Linear flow labels for the preview: Trigger → step → step → … */
export function flowPreview(def: WorkflowDefinition): string[] {
  return [describeTrigger(def.trigger), ...def.steps.map(describeStep)];
}

/* ── Dry-run simulation ──────────────────────────────────────────────────── */

export interface SampleEvent {
  risk?: RiskLevel;
  kind?: string;
  score?: number;
  source?: string;
}

export type StepOutcome = "run" | "paused" | "waited" | "skipped" | "stopped";

export interface SimulatedStep {
  step: WorkflowStepDef;
  outcome: StepOutcome;
  detail: string;
}

export interface SimulationResult {
  steps: SimulatedStep[];
  reached: number;
  stoppedAt: number | null;
}

function evalCondition(c: StepCondition, ev: SampleEvent): boolean {
  if (c.field === "risk") {
    const want = ["low", "medium", "high", "critical"].includes(c.value) ? (c.value as RiskLevel) : "low";
    const have = ev.risk ?? "low";
    return c.op === "gte" ? RISK_RANK[have] >= RISK_RANK[want] : have === c.value;
  }
  if (c.field === "score") {
    const n = Number(c.value) || 0;
    const have = ev.score ?? 0;
    return c.op === "gte" ? have >= n : have === n;
  }
  const have = String((c.field === "kind" ? ev.kind : ev.source) ?? "").toLowerCase();
  const want = c.value.toLowerCase();
  return c.op === "contains" ? have.includes(want) : have === want;
}

/**
 * Dry-run the definition against a sample event: walk the blocks, evaluate
 * conditions, and report what would run / pause / wait / skip / stop.
 */
export function simulateRun(def: WorkflowDefinition, event: SampleEvent): SimulationResult {
  const steps: SimulatedStep[] = [];
  let stopped = false;
  let stoppedAt: number | null = null;

  def.steps.forEach((step, i) => {
    if (stopped) {
      steps.push({ step, outcome: "skipped", detail: "Skipped — run stopped earlier" });
      return;
    }
    if (step.type === "condition" && step.condition) {
      const ok = evalCondition(step.condition, event);
      if (ok) {
        steps.push({ step, outcome: "run", detail: "Condition met — continuing" });
      } else if ((step.onFalse ?? "stop") === "stop") {
        steps.push({ step, outcome: "stopped", detail: "Condition not met — run stops" });
        stopped = true;
        stoppedAt = i;
      } else {
        steps.push({ step, outcome: "run", detail: "Condition not met — continuing (continue-on-false)" });
      }
      return;
    }
    if (step.type === "decision") {
      steps.push({ step, outcome: "paused", detail: "Awaiting human approval" });
      return;
    }
    if (step.type === "wait") {
      steps.push({ step, outcome: "waited", detail: `Waiting ${step.delayHours ?? 0}h` });
      return;
    }
    steps.push({ step, outcome: "run", detail: STEP_CATALOG[step.type].description });
  });

  const reached = steps.filter((s) => s.outcome !== "skipped").length;
  return { steps, reached, stoppedAt };
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
