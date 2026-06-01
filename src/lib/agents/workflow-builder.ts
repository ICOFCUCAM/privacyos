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
  // event
  | "threat_detected" | "incident_raised" | "breach_detected" | "domain_risk"
  | "deepfake_detected" | "doxxing_detected" | "exposure_found" | "score_above" | "case_opened"
  // schedule
  | "scheduled"
  // manual
  | "manual" | "agent_request"
  // api
  | "webhook" | "external";

export type TriggerCategory = "event" | "schedule" | "manual" | "api";

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
export type ConditionOp = "eq" | "gt" | "gte" | "lt" | "lte" | "contains" | "exists";

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

/**
 * Action catalog — the concrete operations agents perform (Layer 7). Each maps
 * to a base block type (+ the owning agent for agent-run actions), so dropping
 * an action adds a real, valid block whose label preserves the action's identity.
 */
export interface ActionBlock {
  id: string;
  label: string;
  type: StepType;
  agent?: AgentKind;
}

export const ACTION_CATALOG: ActionBlock[] = [
  { id: "create-case", label: "Create Case", type: "case" },
  { id: "generate-report", label: "Generate Report", type: "report" },
  { id: "generate-legal-notice", label: "Generate Legal Notice", type: "agent", agent: "legal" },
  { id: "broker-removal", label: "Launch Broker Removal", type: "takedown" },
  { id: "deep-scan", label: "Launch Deep Scan", type: "agent", agent: "discovery" },
  { id: "reputation-scan", label: "Launch Reputation Scan", type: "agent", agent: "reputation" },
  { id: "create-incident", label: "Create Incident", type: "agent", agent: "incident" },
  { id: "assign-investigator", label: "Assign Investigator", type: "agent", agent: "incident" },
  { id: "send-notification", label: "Send Notification", type: "notify" },
  { id: "escalate-severity", label: "Escalate Severity", type: "agent", agent: "incident" },
  { id: "close-case", label: "Close Case", type: "case" },
  { id: "archive-evidence", label: "Archive Evidence", type: "agent", agent: "compliance" },
];

/** Build a fresh step from an action-catalog entry. */
export function actionToStep(a: ActionBlock): WorkflowStepDef {
  return { id: newStepId(), type: a.type, label: a.label, ...(a.agent ? { agent: a.agent } : {}) };
}

export const TRIGGER_CATALOG: Record<TriggerKind, { label: string; category: TriggerCategory }> = {
  threat_detected: { label: "New Threat", category: "event" },
  incident_raised: { label: "New Incident", category: "event" },
  breach_detected: { label: "New Breach", category: "event" },
  domain_risk: { label: "New Domain Risk", category: "event" },
  deepfake_detected: { label: "New Deepfake", category: "event" },
  doxxing_detected: { label: "New Doxxing Event", category: "event" },
  exposure_found: { label: "Exposure found", category: "event" },
  score_above: { label: "Risk score above…", category: "event" },
  case_opened: { label: "Case opened", category: "event" },
  scheduled: { label: "On a schedule", category: "schedule" },
  manual: { label: "User click", category: "manual" },
  agent_request: { label: "Agent request", category: "manual" },
  webhook: { label: "Webhook", category: "api" },
  external: { label: "External system", category: "api" },
};

export const TRIGGER_CATEGORIES: { category: TriggerCategory; label: string }[] = [
  { category: "event", label: "Event triggers" },
  { category: "schedule", label: "Schedule triggers" },
  { category: "manual", label: "Manual triggers" },
  { category: "api", label: "API triggers" },
];

/** Risk-qualified event triggers that fire off a minimum severity. */
export const RISK_QUALIFIED_TRIGGERS: TriggerKind[] = [
  "threat_detected", "incident_raised", "breach_detected", "domain_risk",
  "deepfake_detected", "doxxing_detected", "exposure_found",
];

const RISK_LABEL: Record<RiskLevel, string> = { low: "Low", medium: "Medium", high: "High", critical: "Critical" };
const RISK_RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };

/** Human description of a trigger, for the flow preview. */
export function describeTrigger(t: WorkflowTrigger): string {
  const sev = t.minRisk ? ` · ${RISK_LABEL[t.minRisk]}+` : "";
  switch (t.kind) {
    case "threat_detected":
      return `New threat${t.threatKind ? ` (${t.threatKind.replace(/_/g, " ")})` : ""}${sev}`;
    case "incident_raised":
      return `New incident${sev}`;
    case "breach_detected":
      return `New breach${sev}`;
    case "domain_risk":
      return `New domain risk${sev}`;
    case "deepfake_detected":
      return `New deepfake${sev}`;
    case "doxxing_detected":
      return `New doxxing event${sev}`;
    case "exposure_found":
      return `Exposure found${sev}`;
    case "score_above":
      return `Risk score above ${t.threshold ?? 70}`;
    case "case_opened":
      return "Case opened";
    case "scheduled":
      return `On a schedule (${t.cadence ?? "daily"})`;
    case "manual":
      return "Manual — user click";
    case "agent_request":
      return "On agent request";
    case "webhook":
      return "Incoming webhook";
    case "external":
      return "External system event";
  }
}

const OP_LABEL: Record<ConditionOp, string> = { eq: "is", gt: ">", gte: "≥", lt: "<", lte: "≤", contains: "contains", exists: "exists" };

/** One-line description of a step, for previews and the graph. */
export function describeStep(s: WorkflowStepDef): string {
  if (s.label?.trim()) return s.label.trim();
  switch (s.type) {
    case "agent": return `${s.agent ?? "agent"} action`;
    case "condition": return s.condition ? `If ${s.condition.field} ${OP_LABEL[s.condition.op]}${s.condition.op === "exists" ? "" : ` ${s.condition.value}`}` : "Condition";
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

/** Reorder by index — drag step `from` to position `to`. */
export function reorderStep(def: WorkflowDefinition, from: number, to: number): WorkflowDefinition {
  const n = def.steps.length;
  if (from === to || from < 0 || from >= n || to < 0 || to >= n) return def;
  const steps = [...def.steps];
  const [moved] = steps.splice(from, 1);
  steps.splice(to, 0, moved);
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
    if (s.type === "condition" && (!s.condition || (s.condition.op !== "exists" && !s.condition.value.trim()))) errors.push(`Block "${name}" needs a condition.`);
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

function numCompare(have: number, want: number, op: ConditionOp): boolean {
  switch (op) {
    case "gt": return have > want;
    case "gte": return have >= want;
    case "lt": return have < want;
    case "lte": return have <= want;
    default: return have === want; // eq
  }
}

function evalCondition(c: StepCondition, ev: SampleEvent): boolean {
  const raw = c.field === "risk" ? ev.risk : c.field === "score" ? ev.score : c.field === "kind" ? ev.kind : ev.source;
  // "exists" is a presence check on the field, regardless of type.
  if (c.op === "exists") return raw !== undefined && raw !== null && String(raw) !== "";

  if (c.field === "risk") {
    const want = (["low", "medium", "high", "critical"] as RiskLevel[]).includes(c.value as RiskLevel) ? (c.value as RiskLevel) : "low";
    return numCompare(RISK_RANK[ev.risk ?? "low"], RISK_RANK[want], c.op);
  }
  if (c.field === "score") {
    return numCompare(ev.score ?? 0, Number(c.value) || 0, c.op);
  }
  // string fields (kind, source): eq / contains
  const have = String(raw ?? "").toLowerCase();
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
