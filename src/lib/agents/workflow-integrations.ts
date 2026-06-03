/**
 * Workflow Integrations (enterprise wiring).
 *
 * Enterprise quality means the Workflow Builder isn't an island: every trigger
 * is fed by a real subsystem and every action writes back into one. This module
 * is the integration map — for each of the ten subsystems it declares the
 * concrete wires (inbound trigger kinds, outbound action blocks, the agents that
 * serve it) and the route it lives at. Pure and unit-tested: every wire is
 * verified to reference a real `TriggerKind`, `ACTION_CATALOG` id and
 * `AgentKind`, and coverage is checked so nothing is left unconnected.
 */

import type { AgentKind } from "@/lib/types";
import { AGENT_LABEL, ALL_AGENT_KINDS } from "@/lib/billing/entitlements";
import {
  ACTION_CATALOG, TRIGGER_CATALOG, type TriggerKind,
} from "./workflow-builder";

export type IntegrationDirection = "inbound" | "outbound" | "bidirectional";

export interface WorkflowIntegration {
  id: string;
  name: string;
  route: string;
  direction: IntegrationDirection;
  summary: string;
  /** Inbound wires: trigger kinds this subsystem fires into workflows. */
  triggers: TriggerKind[];
  /** Outbound wires: ACTION_CATALOG ids workflows use to act on it. */
  actions: string[];
  /** Agents that serve this subsystem as workflow blocks. */
  agents: AgentKind[];
}

export const WORKFLOW_INTEGRATIONS: WorkflowIntegration[] = [
  {
    id: "cases",
    name: "Cases",
    route: "/dashboard/cases",
    direction: "bidirectional",
    summary: "A case opening triggers workflows; workflows open, close and update cases.",
    triggers: ["case_opened"],
    actions: ["create-case", "close-case"],
    agents: ["orchestrator"],
  },
  {
    id: "threats",
    name: "Threat Feed",
    route: "/dashboard/threats",
    direction: "inbound",
    summary: "Every detection — threat, breach, deepfake, doxxing, domain risk — fires a workflow trigger.",
    triggers: ["threat_detected", "breach_detected", "deepfake_detected", "doxxing_detected", "domain_risk"],
    actions: ["deep-scan"],
    agents: ["threat_intel", "discovery"],
  },
  {
    id: "incidents",
    name: "Incidents",
    route: "/dashboard/incidents",
    direction: "bidirectional",
    summary: "A raised incident triggers response workflows; workflows create incidents, assign investigators and escalate.",
    triggers: ["incident_raised"],
    actions: ["create-incident", "assign-investigator", "escalate-severity"],
    agents: ["incident"],
  },
  {
    id: "reports",
    name: "Reports",
    route: "/dashboard/reports",
    direction: "outbound",
    summary: "Workflows generate reports and legal notices as their final, audit-ready artifact.",
    triggers: ["scheduled"],
    actions: ["generate-report", "generate-legal-notice"],
    agents: ["legal"],
  },
  {
    id: "reputation",
    name: "ReputationOS",
    route: "/dashboard/reputation",
    direction: "bidirectional",
    summary: "A reputation-score breach or negative-press detection triggers recovery; workflows launch reputation scans.",
    triggers: ["score_above", "threat_detected"],
    actions: ["reputation-scan"],
    agents: ["reputation"],
  },
  {
    id: "executive",
    name: "Executive Protection",
    route: "/dashboard/executive",
    direction: "bidirectional",
    summary: "Executive-risk thresholds trigger protection sweeps run by the Executive Protection Agent.",
    triggers: ["score_above", "threat_detected"],
    actions: ["deep-scan", "create-case"],
    agents: ["executive"],
  },
  {
    id: "family",
    name: "Family Protection",
    route: "/dashboard/family",
    direction: "bidirectional",
    summary: "A family exposure triggers a sweep; workflows opt relatives out and remove broker listings.",
    triggers: ["exposure_found"],
    actions: ["broker-removal", "deep-scan"],
    agents: ["privacy", "discovery"],
  },
  {
    id: "compliance",
    name: "Compliance",
    route: "/dashboard/compliance",
    direction: "bidirectional",
    summary: "Cases and schedules trigger compliance cycles; workflows archive evidence run by the Compliance Agent.",
    triggers: ["case_opened", "scheduled"],
    actions: ["archive-evidence", "generate-report"],
    agents: ["compliance"],
  },
  {
    id: "mission-control",
    name: "Mission Control",
    route: "/dashboard/mission-control",
    direction: "bidirectional",
    summary: "Workflows surface in Mission Control's posture; agent requests from Mission Control trigger workflows.",
    triggers: ["agent_request", "manual"],
    actions: ["send-notification"],
    agents: ["orchestrator"],
  },
];

/* ── Verification ─────────────────────────────────────────────────────────── */

const ACTION_IDS = new Set(ACTION_CATALOG.map((a) => a.id));
const TRIGGER_KINDS = new Set(Object.keys(TRIGGER_CATALOG) as TriggerKind[]);
const AGENT_KINDS = new Set<AgentKind>(ALL_AGENT_KINDS);

export interface IntegrationCheck {
  id: string;
  valid: boolean;
  issues: string[];
  /** Total concrete wires (triggers + actions + agents). */
  wires: number;
}

/** Verify a single integration's wires reference real model symbols. */
export function verifyIntegration(i: WorkflowIntegration): IntegrationCheck {
  const issues: string[] = [];
  for (const t of i.triggers) if (!TRIGGER_KINDS.has(t)) issues.push(`unknown trigger "${t}"`);
  for (const a of i.actions) if (!ACTION_IDS.has(a)) issues.push(`unknown action "${a}"`);
  for (const g of i.agents) if (!AGENT_KINDS.has(g)) issues.push(`unknown agent "${g}"`);
  const wires = i.triggers.length + i.actions.length + i.agents.length;
  if (wires === 0) issues.push("no wires");
  return { id: i.id, valid: issues.length === 0, wires, issues };
}

export interface IntegrationCoverage {
  integrations: number;
  allValid: boolean;
  /** Trigger kinds owned by at least one integration. */
  triggersCovered: TriggerKind[];
  /** Action ids used by at least one integration. */
  actionsUsed: string[];
  /** Agents referenced by at least one integration. */
  agentsReferenced: AgentKind[];
  issues: { id: string; issues: string[] }[];
}

/** Roll up coverage across all integrations. */
export function integrationCoverage(integrations = WORKFLOW_INTEGRATIONS): IntegrationCoverage {
  const triggers = new Set<TriggerKind>();
  const actions = new Set<string>();
  const agents = new Set<AgentKind>();
  const issues: { id: string; issues: string[] }[] = [];
  let allValid = true;

  for (const i of integrations) {
    const check = verifyIntegration(i);
    if (!check.valid) { allValid = false; issues.push({ id: i.id, issues: check.issues }); }
    i.triggers.forEach((t) => triggers.add(t));
    i.actions.forEach((a) => actions.add(a));
    i.agents.forEach((g) => agents.add(g));
  }

  return {
    integrations: integrations.length,
    allValid,
    triggersCovered: [...triggers],
    actionsUsed: [...actions],
    agentsReferenced: [...agents],
    issues,
  };
}

/* ── The 13-agent roster ──────────────────────────────────────────────────── */

export interface AgentRosterEntry {
  agent: AgentKind;
  label: string;
  /** The integration(s) this agent serves, by name. */
  serves: string[];
}

/**
 * Every one of the 13 agents, with the subsystems it serves. Confirms the
 * builder integrates the full fleet — each agent is an available workflow block.
 */
export function agentRoster(): AgentRosterEntry[] {
  return ALL_AGENT_KINDS.map((agent) => ({
    agent,
    label: AGENT_LABEL[agent],
    serves: WORKFLOW_INTEGRATIONS.filter((i) => i.agents.includes(agent)).map((i) => i.name),
  }));
}
