import { describe, it, expect } from "vitest";
import {
  COLLABORATIONS, findCollaboration, collaborationAgents, runCollaboration,
  collaborationToDefinition, collaborationStats,
} from "./agent-collaboration";
import { validateWorkflow, executeWorkflow } from "./workflow-builder";

describe("agent collaboration engine (Layer 15)", () => {
  it("models the canonical deepfake collaboration chain", () => {
    const c = findCollaboration("deepfake-response")!;
    expect(c.trigger).toBe("Deepfake Detected");
    // Deepfake → Threat Intel → Reputation → Legal → Incident → [Case] → Executive
    const order = c.nodes.map((n) =>
      n.kind === "agent" ? n.agent : n.kind === "case" ? "CASE" : "TRIGGER");
    expect(order).toEqual([
      "TRIGGER", "deepfake", "threat_intel", "reputation", "legal", "incident", "CASE", "executive",
    ]);
  });

  it("hands off shared context coherently — no agent consumes before produce", () => {
    for (const c of COLLABORATIONS) {
      const run = runCollaboration(c);
      expect(run.coherent, c.name).toBe(true);
      expect(run.caseCreated).toBe(true);
      // context grows monotonically and ends with every produced artifact
      expect(run.sharedContext.length).toBe(collaborationAgents(c).length);
    }
  });

  it("each handoff records what it consumed and produced", () => {
    const run = runCollaboration(findCollaboration("deepfake-response")!);
    const legal = run.handoffs.find((h) => h.agent === "legal")!;
    expect(legal.consumes).toContain("Deepfake analysis");
    expect(legal.consumes).toContain("Reputation impact");
    expect(legal.produces).toBe("Legal notices");
    expect(legal.missing).toHaveLength(0);
    // the executive (last) sees the full accumulated context
    const exec = run.handoffs.at(-1)!;
    expect(exec.agent).toBe("executive");
    expect(exec.contextAfter).toContain("Incident plan");
  });

  it("detects a broken handoff (consume before produce)", () => {
    const broken = {
      ...findCollaboration("deepfake-response")!,
      nodes: [
        { kind: "trigger" as const, label: "X" },
        // legal consumes an artifact nobody produced yet
        { kind: "agent" as const, agent: "legal" as const, role: "Act early", produces: "Notice", consumes: ["Nonexistent artifact"] },
      ],
    };
    const run = runCollaboration(broken);
    expect(run.coherent).toBe(false);
    expect(run.handoffs[0].missing).toContain("Nonexistent artifact");
  });

  it("lowers into a valid, runnable workflow definition", () => {
    for (const c of COLLABORATIONS) {
      const def = collaborationToDefinition(c);
      expect(validateWorkflow(def).valid, c.name).toBe(true);
      expect(def.steps.at(-1)!.type).toBe("report");
      const run = executeWorkflow(def, { risk: "high" });
      expect(run.status).toBe("success");
      // every collaborating agent shows up in the run's agent activity
      const ran = new Set(run.agentActivity.map((a) => a.agent));
      for (const a of collaborationAgents(c)) expect(ran.has(a), `${c.name}:${a}`).toBe(true);
    }
  });

  it("summarizes the catalog", () => {
    const s = collaborationStats();
    expect(s.scenarios).toBe(COLLABORATIONS.length);
    expect(s.maxAgents).toBeGreaterThanOrEqual(6); // deepfake has 6 distinct agents
    expect(s.agentsInvolved).toBeGreaterThan(5);
  });
});
