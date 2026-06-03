import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  saveWorkflow: vi.fn(async (_def: { id: string }) => {}),
  recordAudit: vi.fn(async () => {}),
  redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`); }),
}));

vi.mock("next/navigation", () => ({ redirect: h.redirect }));
vi.mock("../actions", () => ({ saveWorkflowAction: h.saveWorkflow }));
vi.mock("@/lib/audit/audit", () => ({ recordAudit: h.recordAudit }));

import { generateWorkflowAction, saveGeneratedWorkflowAction } from "./actions";

beforeEach(() => { h.saveWorkflow.mockClear(); h.recordAudit.mockClear(); h.redirect.mockClear(); });

describe("generateWorkflowAction", () => {
  it("generates a workflow from a prompt and audits it", async () => {
    const result = await generateWorkflowAction("Protect my CEO from doxxing.");
    expect(result.definition.steps.length).toBeGreaterThan(0);
    expect(result.persona).toBe("executive");
    expect(result.threat).toBe("doxxing");
    // no API keys in the test env → the rules engine is authoritative
    expect(result.source).toBe("rules");
    expect(h.recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "workflow.generated" }));
  });

  it("trims and caps the prompt", async () => {
    const result = await generateWorkflowAction("   remove my data from brokers   ");
    expect(result.prompt.startsWith(" ")).toBe(false);
    expect(result.threat).toBe("broker");
  });
});

describe("saveGeneratedWorkflowAction", () => {
  it("saves the definition and opens the builder", async () => {
    await expect(saveGeneratedWorkflowAction({ id: "draft", name: "x", trigger: { kind: "manual" }, steps: [], enabled: false }))
      .rejects.toThrow(/REDIRECT:\/dashboard\/workflow-builder\?from=generated/);
    expect(h.saveWorkflow).toHaveBeenCalledOnce();
  });
});
