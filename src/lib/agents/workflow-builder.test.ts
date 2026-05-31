import { describe, it, expect } from "vitest";
import {
  addStep, describeTrigger, emptyWorkflow, flowPreview, moveStep, removeStep,
  validateWorkflow, type WorkflowDefinition, type WorkflowStepDef,
} from "./workflow-builder";

const step = (over: Partial<WorkflowStepDef>): WorkflowStepDef => ({
  id: Math.random().toString(36).slice(2), type: "agent", agent: "security", label: "Rotate creds", ...over,
});

const wf = (over: Partial<WorkflowDefinition> = {}): WorkflowDefinition => ({
  ...emptyWorkflow("w1"), name: "Breach response", ...over,
});

describe("describeTrigger", () => {
  it("describes each trigger kind", () => {
    expect(describeTrigger({ kind: "threat_detected", minRisk: "high" })).toMatch(/Threat detected.*High/);
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

describe("flowPreview", () => {
  it("renders trigger then step labels", () => {
    const preview = flowPreview(wf({ steps: [step({ label: "Rotate" }), step({ type: "notify", label: "Notify user", agent: undefined })] }));
    expect(preview[0]).toMatch(/Threat detected/);
    expect(preview).toContain("Rotate");
    expect(preview).toContain("Notify user");
  });
});
