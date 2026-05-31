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
    const t = AUTOMATION_TEMPLATES.find((x) => x.id === "critical-breach-response")!;
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
    expect(findTemplate("deepfake-takedown")?.category).toBe("Reputation & impersonation");
    expect(findTemplate("nope")).toBeUndefined();
  });

  it("stats summarize the catalog", () => {
    const s = templateStats();
    expect(s.total).toBe(AUTOMATION_TEMPLATES.length);
    expect(s.recommended).toBeGreaterThan(0);
    expect(s.categories).toBeGreaterThan(1);
    expect(s.avgImpact).toBeGreaterThan(0);
  });
});
