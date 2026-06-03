import { describe, it, expect } from "vitest";
import {
  AUTOMATION_TEMPLATES, findTemplate, groupTemplates, templateAgents,
  templateStats, templateToDefinition,
} from "./automation-templates";
import { validateWorkflow } from "./workflow-builder";

describe("automation templates", () => {
  it("every template instantiates into a valid draft definition", () => {
    for (const t of AUTOMATION_TEMPLATES) {
      const def = templateToDefinition(t);
      expect(def.id).toBe("draft");
      expect(def.steps).toHaveLength(t.steps.length);
      // fresh, unique step ids
      const ids = new Set(def.steps.map((s) => s.id));
      expect(ids.size).toBe(def.steps.length);
      expect(validateWorkflow(def).valid).toBe(true);
    }
  });

  it("templateAgents returns distinct agents in order", () => {
    const t = AUTOMATION_TEMPLATES.find((x) => x.id === "breach-response")!;
    const agents = templateAgents(t);
    expect(new Set(agents).size).toBe(agents.length);
    expect(agents).toContain("security");
  });

  it("groups by category, recommended first", () => {
    const groups = groupTemplates();
    expect(groups.length).toBeGreaterThan(0);
    for (const g of groups) {
      const recAfterPlain = g.items.findIndex((t, i) => !t.recommended && g.items.slice(i).some((x) => x.recommended));
      expect(recAfterPlain).toBe(-1); // no recommended appears after a non-recommended
    }
  });

  it("findTemplate resolves ids", () => {
    expect(findTemplate("reputation-recovery")?.category).toBe("Reputation");
    expect(findTemplate("nope")).toBeUndefined();
  });

  it("Layer-9 escalation engine: Critical Threat → Case → Incident → Executive → Board Report", () => {
    const t = findTemplate("critical-escalation")!;
    expect(t).toBeDefined();
    expect(t.trigger).toMatchObject({ kind: "threat_detected", minRisk: "critical" });
    expect(t.steps.map((s) => s.label)).toEqual(["Open Case", "Assign Incident Agent", "Notify Executive", "Create Board Report"]);
    expect(t.steps.map((s) => s.type)).toEqual(["case", "agent", "notify", "report"]);
    expect(validateWorkflow(templateToDefinition(t)).valid).toBe(true);
  });

  it("covers the Layer-2 library: 5 categories, 11 workflows", () => {
    expect(new Set(AUTOMATION_TEMPLATES.map((t) => t.category))).toEqual(new Set(["Security", "Privacy", "Reputation", "Executive", "Business"]));
    for (const id of [
      "credential-leak-response", "breach-response", "dark-web-monitoring",
      "broker-removal", "identity-protection", "reputation-recovery", "seo-recovery",
      "executive-protection-sweep", "family-protection-sweep",
      "vendor-risk-assessment", "employee-exposure-response",
    ]) {
      expect(findTemplate(id), id).toBeDefined();
    }
  });

  it("stats summarize the catalog", () => {
    const s = templateStats();
    expect(s.total).toBe(AUTOMATION_TEMPLATES.length);
    expect(s.recommended).toBeGreaterThan(0);
    expect(s.categories).toBeGreaterThan(1);
    expect(s.avgImpact).toBeGreaterThan(0);
  });
});
