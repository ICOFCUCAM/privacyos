import { describe, it, expect } from "vitest";
import { generateWorkflow, generateWorkflowWithAI } from "./workflow-generator";
import { validateWorkflow } from "./workflow-builder";
import type { LLMProvider } from "./llm/provider";

describe("AI workflow generator (Layer 14)", () => {
  it('builds the canonical chain for "Protect my CEO from doxxing."', () => {
    const g = generateWorkflow("Protect my CEO from doxxing.");
    expect(g.persona).toBe("executive");
    expect(g.threat).toBe("doxxing");
    expect(g.definition.trigger.kind).toBe("doxxing_detected");
    expect(validateWorkflow(g.definition).valid).toBe(true);

    // Trigger → Discovery → Executive → Risk Assessment → Case → Legal → Report
    const chain = g.definition.steps.map((s) => (s.type === "agent" ? s.agent : s.type));
    expect(chain).toEqual(["discovery", "executive", "threat_intel", "case", "legal", "report"]);
    expect(g.confidence).toBeGreaterThanOrEqual(90);
  });

  it("reads subject and threat across phrasings", () => {
    expect(generateWorkflow("remove my data from data brokers").threat).toBe("broker");
    expect(generateWorkflow("my company had a credential breach").persona).toBe("business");
    expect(generateWorkflow("my company had a credential breach").threat).toBe("breach");
    expect(generateWorkflow("protect my family's privacy online").persona).toBe("family");
    expect(generateWorkflow("someone made a deepfake of our founder").threat).toBe("deepfake");
    expect(generateWorkflow("a fake account is impersonating me").threat).toBe("impersonation");
  });

  it("always produces a valid definition, even for a vague prompt", () => {
    const g = generateWorkflow("help");
    expect(validateWorkflow(g.definition).valid).toBe(true);
    expect(g.definition.steps[0].agent).toBe("discovery");
    expect(g.definition.steps.at(-1)!.type).toBe("report");
    expect(g.confidence).toBeLessThan(60); // weak signal
  });

  it("threat-specific remediation is inserted before case creation", () => {
    const breach = generateWorkflow("we had a breach");
    const labels = breach.definition.steps.map((s) => s.label);
    const caseIdx = breach.definition.steps.findIndex((s) => s.type === "case");
    const rotateIdx = labels.findIndex((l) => /Rotate/.test(l));
    expect(rotateIdx).toBeGreaterThanOrEqual(0);
    expect(rotateIdx).toBeLessThan(caseIdx);
  });

  describe("LLM-assisted path", () => {
    it("uses a valid AI plan and marks the source as ai", async () => {
      const fake: LLMProvider = {
        name: "fake",
        async complete() {
          return {
            provider: "fake", model: "x",
            text: JSON.stringify({
              name: "Custom plan",
              trigger: { kind: "doxxing_detected" },
              steps: [
                { type: "agent", agent: "discovery", label: "Find exposure" },
                { type: "report", label: "Report" },
              ],
            }),
          };
        },
      };
      const g = await generateWorkflowWithAI("protect my CEO from doxxing", fake);
      expect(g.source).toBe("ai");
      expect(g.definition.name).toBe("Custom plan");
      expect(validateWorkflow(g.definition).valid).toBe(true);
    });

    it("falls back to the rules engine when the AI output is unusable", async () => {
      const bad: LLMProvider = {
        name: "bad",
        async complete() {
          return { provider: "bad", model: "x", text: "not json at all" };
        },
      };
      const g = await generateWorkflowWithAI("protect my CEO from doxxing", bad);
      expect(g.source).toBe("rules");
      expect(validateWorkflow(g.definition).valid).toBe(true);
    });

    it("rejects an AI plan with an agent step missing its agent", async () => {
      const invalid: LLMProvider = {
        name: "inv",
        async complete() {
          return {
            provider: "inv", model: "x",
            text: JSON.stringify({ steps: [{ type: "agent", label: "no agent here" }] }),
          };
        },
      };
      const g = await generateWorkflowWithAI("anything", invalid);
      expect(g.source).toBe("rules"); // invalid plan rejected
    });

    it("with no provider, returns the deterministic result", async () => {
      const g = await generateWorkflowWithAI("protect my CEO from doxxing");
      expect(g.source).toBe("rules");
    });
  });
});
