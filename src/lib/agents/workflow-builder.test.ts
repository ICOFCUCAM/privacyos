import { describe, it, expect } from "vitest";
import {
  addStep, describeTrigger, describeStep, emptyWorkflow, flowPreview, moveStep, removeStep, reorderStep,
  validateWorkflow, simulateRun, STEP_CATALOG, TRIGGER_CATALOG, TRIGGER_CATEGORIES,
  ACTION_CATALOG, actionToStep,
  type WorkflowDefinition, type WorkflowStepDef,
} from "./workflow-builder";

const step = (over: Partial<WorkflowStepDef>): WorkflowStepDef => ({
  id: Math.random().toString(36).slice(2), type: "agent", agent: "security", label: "Rotate creds", ...over,
});

const wf = (over: Partial<WorkflowDefinition> = {}): WorkflowDefinition => ({
  ...emptyWorkflow("w1"), name: "Breach response", ...over,
});

describe("describeTrigger", () => {
  it("describes each trigger kind", () => {
    expect(describeTrigger({ kind: "threat_detected", minRisk: "high" })).toMatch(/New threat.*High/);
    expect(describeTrigger({ kind: "score_above", threshold: 80 })).toBe("Risk score above 80");
    expect(describeTrigger({ kind: "manual" })).toMatch(/Manual/);
  });
});

describe("editing ops", () => {
  it("adds, removes and reorders steps immutably", () => {
    const a = step({ id: "a", label: "A" });
    const b = step({ id: "b", label: "B" });
    let def = addStep(addStep(wf(), a), b);
    expect(def.steps.map((s) => s.id)).toEqual(["a", "b"]);

    def = moveStep(def, "b", -1);
    expect(def.steps.map((s) => s.id)).toEqual(["b", "a"]);

    // clamp at edges
    expect(moveStep(def, "b", -1).steps.map((s) => s.id)).toEqual(["b", "a"]);

    def = removeStep(def, "b");
    expect(def.steps.map((s) => s.id)).toEqual(["a"]);
  });

  it("reorders by index (drag-and-drop) immutably, clamped", () => {
    let def = wf({ steps: [step({ id: "a" }), step({ id: "b" }), step({ id: "c" })] });
    expect(reorderStep(def, 0, 2).steps.map((s) => s.id)).toEqual(["b", "c", "a"]); // drag a → end
    expect(reorderStep(def, 2, 0).steps.map((s) => s.id)).toEqual(["c", "a", "b"]); // drag c → front
    expect(reorderStep(def, 1, 1).steps.map((s) => s.id)).toEqual(["a", "b", "c"]); // no-op
    expect(reorderStep(def, 0, 9).steps.map((s) => s.id)).toEqual(["a", "b", "c"]); // out of range
  });
});

describe("validateWorkflow", () => {
  it("requires a name and at least one step", () => {
    expect(validateWorkflow(wf({ name: "", steps: [] })).valid).toBe(false);
    const r = validateWorkflow(wf({ name: "", steps: [] }));
    expect(r.errors.length).toBeGreaterThanOrEqual(2);
  });

  it("requires an agent on agent steps", () => {
    const r = validateWorkflow(wf({ steps: [step({ type: "agent", agent: undefined })] }));
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => /needs an agent/.test(e))).toBe(true);
  });

  it("passes a well-formed workflow", () => {
    const r = validateWorkflow(wf({ steps: [step({})] }));
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it("requires a positive threshold for score triggers", () => {
    const r = validateWorkflow(wf({ trigger: { kind: "score_above", threshold: 0 }, steps: [step({})] }));
    expect(r.valid).toBe(false);
  });
});

describe("expanded blocks", () => {
  it("describes the new triggers", () => {
    expect(describeTrigger({ kind: "scheduled", cadence: "every 6h" })).toMatch(/schedule.*every 6h/);
    expect(describeTrigger({ kind: "case_opened" })).toBe("Case opened");
    expect(describeTrigger({ kind: "incident_raised", minRisk: "critical" })).toMatch(/New incident.*Critical/);
    expect(describeTrigger({ kind: "breach_detected", minRisk: "high" })).toMatch(/New breach.*High/);
    expect(describeTrigger({ kind: "deepfake_detected" })).toMatch(/New deepfake/);
    expect(describeTrigger({ kind: "doxxing_detected" })).toMatch(/New doxxing/);
    expect(describeTrigger({ kind: "agent_request" })).toMatch(/agent request/i);
    expect(describeTrigger({ kind: "webhook" })).toMatch(/webhook/i);
    expect(describeTrigger({ kind: "external" })).toMatch(/External/);
  });

  it("validates condition / webhook / wait blocks", () => {
    expect(validateWorkflow(wf({ steps: [step({ type: "condition", condition: undefined })] })).valid).toBe(false);
    expect(validateWorkflow(wf({ steps: [step({ type: "webhook", url: "" })] })).valid).toBe(false);
    expect(validateWorkflow(wf({ steps: [step({ type: "wait", delayHours: 0 })] })).valid).toBe(false);
    expect(validateWorkflow(wf({ steps: [step({ type: "wait", delayHours: 24 })] })).valid).toBe(true);
  });

  it("describeStep falls back to a generated label per type", () => {
    expect(describeStep(step({ type: "condition", label: "", condition: { field: "risk", op: "gte", value: "critical" } }))).toMatch(/If risk ≥ critical/);
    expect(describeStep(step({ type: "wait", label: "", delayHours: 48 }))).toMatch(/Wait 48h/);
  });

  it("STEP_CATALOG covers every step type with a category", () => {
    for (const meta of Object.values(STEP_CATALOG)) {
      expect(["action", "logic", "human", "integration"]).toContain(meta.category);
    }
  });

  it("ACTION_CATALOG covers the Layer-7 actions; each adds a valid block", () => {
    const labels = ACTION_CATALOG.map((a) => a.label);
    for (const want of [
      "Create Case", "Generate Report", "Generate Legal Notice", "Launch Broker Removal",
      "Launch Deep Scan", "Launch Reputation Scan", "Create Incident", "Assign Investigator",
      "Send Notification", "Escalate Severity", "Close Case", "Archive Evidence",
    ]) {
      expect(labels, want).toContain(want);
    }
    for (const a of ACTION_CATALOG) {
      const def = wf({ steps: [actionToStep(a)] });
      expect(validateWorkflow(def).valid, a.label).toBe(true); // agent actions carry their agent
    }
  });

  it("TRIGGER_CATALOG covers the Layer-4 taxonomy (event/schedule/manual/api)", () => {
    const byCat = (c: string) => Object.values(TRIGGER_CATALOG).filter((t) => t.category === c).map((t) => t.label);
    expect(TRIGGER_CATEGORIES.map((g) => g.category)).toEqual(["event", "schedule", "manual", "api"]);
    expect(byCat("event")).toEqual(expect.arrayContaining(["New Threat", "New Incident", "New Breach", "New Domain Risk", "New Deepfake", "New Doxxing Event"]));
    expect(byCat("manual")).toEqual(expect.arrayContaining(["User click", "Agent request"]));
    expect(byCat("api")).toEqual(expect.arrayContaining(["Webhook", "External system"]));
    expect(byCat("schedule").length).toBeGreaterThan(0);
  });
});

describe("simulateRun (dry-run)", () => {
  it("stops at a failed condition, skips the rest", () => {
    const def = wf({ steps: [
      step({ id: "c", type: "condition", label: "If critical", condition: { field: "risk", op: "gte", value: "critical" }, onFalse: "stop" }),
      step({ id: "a", type: "agent", agent: "security", label: "Rotate" }),
    ] });
    const low = simulateRun(def, { risk: "medium" });
    expect(low.steps[0].outcome).toBe("stopped");
    expect(low.steps[1].outcome).toBe("skipped");
    expect(low.stoppedAt).toBe(0);

    const crit = simulateRun(def, { risk: "critical" });
    expect(crit.steps[0].outcome).toBe("run");
    expect(crit.steps[1].outcome).toBe("run");
    expect(crit.stoppedAt).toBeNull();
  });

  it("marks approval as paused and wait as waited", () => {
    const def = wf({ steps: [
      step({ id: "d", type: "decision", agent: undefined, label: "Approve" }),
      step({ id: "w", type: "wait", agent: undefined, label: "Cooldown", delayHours: 12 }),
    ] });
    const r = simulateRun(def, { risk: "high" });
    expect(r.steps[0].outcome).toBe("paused");
    expect(r.steps[1].outcome).toBe("waited");
    expect(r.reached).toBe(2);
  });

  it("evaluates the Layer-5 operators (>, =, exists)", () => {
    // IF Risk(score) > 80 THEN escalate
    const gt = wf({ steps: [
      step({ id: "c", type: "condition", label: "score>80", condition: { field: "score", op: "gt", value: "80" }, onFalse: "stop" }),
      step({ id: "e", type: "agent", agent: "incident", label: "Escalate" }),
    ] });
    expect(simulateRun(gt, { score: 85 }).steps[1].outcome).toBe("run");
    expect(simulateRun(gt, { score: 80 }).steps[1].outcome).toBe("skipped"); // strict >
    expect(simulateRun(gt, { score: 70 }).steps[0].outcome).toBe("stopped");

    // IF Severity = Critical THEN open case
    const eq = wf({ steps: [
      step({ id: "c", type: "condition", label: "sev=crit", condition: { field: "risk", op: "eq", value: "critical" }, onFalse: "stop" }),
      step({ id: "k", type: "case", agent: undefined, label: "Open case" }),
    ] });
    expect(simulateRun(eq, { risk: "critical" }).steps[1].outcome).toBe("run");
    expect(simulateRun(eq, { risk: "high" }).steps[1].outcome).toBe("skipped");

    // IF Domain Risk Exists THEN scan  (exists needs no value)
    const ex = wf({ steps: [
      step({ id: "c", type: "condition", label: "domain exists", condition: { field: "source", op: "exists", value: "" }, onFalse: "stop" }),
      step({ id: "s", type: "agent", agent: "discovery", label: "Launch domain scan" }),
    ] });
    expect(validateWorkflow(ex).valid).toBe(true); // exists doesn't require a value
    expect(simulateRun(ex, { source: "domain-broker" }).steps[1].outcome).toBe("run");
    expect(simulateRun(ex, {}).steps[1].outcome).toBe("skipped");
  });

  it("continue-on-false keeps running", () => {
    const def = wf({ steps: [
      step({ id: "c", type: "condition", label: "maybe", condition: { field: "source", op: "contains", value: "dark" }, onFalse: "continue" }),
      step({ id: "a", type: "agent", agent: "security", label: "Act" }),
    ] });
    const r = simulateRun(def, { source: "social_media" });
    expect(r.steps[0].outcome).toBe("run");
    expect(r.steps[1].outcome).toBe("run");
  });
});

describe("flowPreview", () => {
  it("renders trigger then step labels", () => {
    const preview = flowPreview(wf({ steps: [step({ label: "Rotate" }), step({ type: "notify", label: "Notify user", agent: undefined })] }));
    expect(preview[0]).toMatch(/New threat/);
    expect(preview).toContain("Rotate");
    expect(preview).toContain("Notify user");
  });
});
