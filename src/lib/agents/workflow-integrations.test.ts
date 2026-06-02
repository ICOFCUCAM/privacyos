import { describe, it, expect } from "vitest";
import {
  WORKFLOW_INTEGRATIONS, verifyIntegration, integrationCoverage, agentRoster,
} from "./workflow-integrations";
import { ACTION_CATALOG, TRIGGER_CATALOG, type TriggerKind } from "./workflow-builder";
import { ALL_AGENT_KINDS } from "@/lib/billing/entitlements";

describe("workflow integrations (enterprise wiring)", () => {
  it("integrates with all ten required subsystems", () => {
    for (const name of [
      "Cases", "Threat Feed", "Incidents", "Reports", "ReputationOS",
      "Executive Protection", "Family Protection", "Compliance", "Mission Control",
    ]) {
      expect(WORKFLOW_INTEGRATIONS.some((i) => i.name === name), name).toBe(true);
    }
  });

  it("every wire references a real trigger / action / agent", () => {
    for (const i of WORKFLOW_INTEGRATIONS) {
      const check = verifyIntegration(i);
      expect(check.issues, `${i.name}: ${check.issues.join(", ")}`).toHaveLength(0);
      expect(check.valid).toBe(true);
      expect(check.wires).toBeGreaterThan(0);
    }
  });

  it("each integration has a route that points at a dashboard surface", () => {
    for (const i of WORKFLOW_INTEGRATIONS) {
      expect(i.route.startsWith("/dashboard/"), i.name).toBe(true);
    }
  });

  it("coverage rolls up clean and connects real model symbols", () => {
    const c = integrationCoverage();
    expect(c.allValid).toBe(true);
    expect(c.issues).toHaveLength(0);
    // every owned trigger / action exists in the real catalog
    const triggerKinds = new Set(Object.keys(TRIGGER_CATALOG) as TriggerKind[]);
    for (const t of c.triggersCovered) expect(triggerKinds.has(t)).toBe(true);
    const actionIds = new Set(ACTION_CATALOG.map((a) => a.id));
    for (const a of c.actionsUsed) expect(actionIds.has(a)).toBe(true);
  });

  it("the inbound detection feeds are all wired (threat/incident/breach/deepfake/doxxing/case)", () => {
    const triggers = new Set(integrationCoverage().triggersCovered);
    for (const t of ["threat_detected", "incident_raised", "breach_detected", "deepfake_detected", "doxxing_detected", "case_opened"] as TriggerKind[]) {
      expect(triggers.has(t), t).toBe(true);
    }
  });

  it("integrates all 13 agents, each as an available block", () => {
    const roster = agentRoster();
    expect(roster).toHaveLength(13);
    expect(roster).toHaveLength(ALL_AGENT_KINDS.length);
    expect(new Set(roster.map((r) => r.agent)).size).toBe(13);
    // every agent has a human label
    for (const r of roster) expect(r.label.length).toBeGreaterThan(0);
    // the core fleet agents are mapped to at least one subsystem
    const byAgent = new Map(roster.map((r) => [r.agent, r.serves]));
    for (const a of ["incident", "compliance", "reputation", "executive", "legal", "threat_intel"] as const) {
      expect(byAgent.get(a)!.length, a).toBeGreaterThan(0);
    }
  });
});
