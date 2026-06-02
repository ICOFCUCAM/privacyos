/**
 * Agent Collaboration Engine (Layer 15).
 *
 * The feature that separates PrivacyOS from ordinary automation platforms: most
 * workflow builders automate *actions* — PrivacyOS automates *agents*. A
 * collaboration is a chain of specialist agents that hand off to one another,
 * each consuming the shared context the prior agents built and contributing its
 * own artifact, until the case is owned end to end.
 *
 * Pure and unit-tested. A collaboration both renders as a handoff graph and
 * lowers into a `WorkflowDefinition`, so it runs on the same execution engine.
 */

import type { AgentKind } from "@/lib/types";
import { AGENT_LABEL } from "@/lib/billing/entitlements";
import {
  newStepId, type TriggerKind, type WorkflowDefinition, type WorkflowStepDef,
} from "./workflow-builder";

/** A node in a collaboration graph. */
export type CollabNode =
  | { kind: "trigger"; label: string }
  | {
      kind: "agent";
      agent: AgentKind;
      /** What this agent does in the collaboration. */
      role: string;
      /** The artifact it contributes to the shared context. */
      produces: string;
      /** Artifacts (by name) it consumes from earlier agents. */
      consumes: string[];
    }
  | { kind: "case"; label: string };

export interface AgentCollaboration {
  id: string;
  name: string;
  /** Human label for the triggering event, e.g. "Deepfake Detected". */
  trigger: string;
  triggerKind: TriggerKind;
  description: string;
  nodes: CollabNode[];
}

const trigger = (label: string): CollabNode => ({ kind: "trigger", label });
const caseNode = (label = "Case Created"): CollabNode => ({ kind: "case", label });
const collab = (
  agent: AgentKind, role: string, produces: string, consumes: string[] = [],
): CollabNode => ({ kind: "agent", agent, role, produces, consumes });

export const COLLABORATIONS: AgentCollaboration[] = [
  {
    id: "deepfake-response",
    name: "Deepfake Response",
    trigger: "Deepfake Detected",
    triggerKind: "deepfake_detected",
    description: "Seven specialists collaborate on a synthetic-media attack — from forensic confirmation through legal takedown to protecting the principal.",
    nodes: [
      trigger("Deepfake Detected"),
      collab("deepfake", "Confirm & fingerprint the synthetic media", "Deepfake analysis"),
      collab("threat_intel", "Trace the origin & distribution network", "Threat attribution", ["Deepfake analysis"]),
      collab("reputation", "Assess reputation impact & sentiment", "Reputation impact", ["Threat attribution"]),
      collab("legal", "Prepare takedown & cease-and-desist", "Legal notices", ["Deepfake analysis", "Reputation impact"]),
      collab("incident", "Coordinate the cross-team response", "Incident plan", ["Threat attribution", "Legal notices"]),
      caseNode(),
      collab("executive", "Brief & protect the principal", "Executive brief", ["Incident plan", "Reputation impact"]),
    ],
  },
  {
    id: "breach-response",
    name: "Breach Response",
    trigger: "Breach Detected",
    triggerKind: "breach_detected",
    description: "Security, intel, legal and compliance collaborate to contain a breach, weigh statutory duties and own the incident.",
    nodes: [
      trigger("Breach Detected"),
      collab("security", "Contain the breach & rotate credentials", "Containment report"),
      collab("threat_intel", "Correlate against known leak sources", "Leak correlation", ["Containment report"]),
      collab("legal", "Assess statutory notification duties", "Legal assessment", ["Leak correlation"]),
      collab("compliance", "Map regulatory obligations & deadlines", "Compliance plan", ["Legal assessment"]),
      collab("incident", "Drive containment to closure", "Incident plan", ["Containment report", "Compliance plan"]),
      caseNode(),
      collab("executive", "Brief leadership on exposure & response", "Executive brief", ["Incident plan"]),
    ],
  },
  {
    id: "doxxing-response",
    name: "Doxxing Response",
    trigger: "Doxxing Detected",
    triggerKind: "doxxing_detected",
    description: "Discovery, privacy, intel and legal collaborate to find, remove and prosecute exposed personal data.",
    nodes: [
      trigger("Doxxing Detected"),
      collab("discovery", "Locate the exposed personal data", "Exposure map"),
      collab("privacy", "File removals & opt-outs across brokers", "Removal queue", ["Exposure map"]),
      collab("threat_intel", "Attribute the doxxing source", "Threat attribution", ["Exposure map"]),
      collab("legal", "Pursue takedown & legal remedies", "Legal notices", ["Threat attribution", "Removal queue"]),
      caseNode(),
      collab("executive", "Protect & brief the principal", "Executive brief", ["Legal notices"]),
    ],
  },
];

/* ── Queries ──────────────────────────────────────────────────────────────── */

export function findCollaboration(id: string): AgentCollaboration | undefined {
  return COLLABORATIONS.find((c) => c.id === id);
}

/** Distinct participating agents, in collaboration order. */
export function collaborationAgents(c: AgentCollaboration): AgentKind[] {
  const seen = new Set<AgentKind>();
  const out: AgentKind[] = [];
  for (const n of c.nodes) {
    if (n.kind === "agent" && !seen.has(n.agent)) {
      seen.add(n.agent);
      out.push(n.agent);
    }
  }
  return out;
}

/* ── Handoff simulation ───────────────────────────────────────────────────── */

export interface Handoff {
  order: number;
  agent: AgentKind;
  agentLabel: string;
  role: string;
  produces: string;
  /** Artifacts consumed from upstream agents (resolved & present). */
  consumes: string[];
  /** Any consumed artifact not yet produced upstream — a broken handoff. */
  missing: string[];
  /** Shared context after this agent contributes. */
  contextAfter: string[];
}

export interface CollaborationRun {
  collaborationId: string;
  handoffs: Handoff[];
  /** Final shared context — every artifact the agents produced together. */
  sharedContext: string[];
  caseCreated: boolean;
  /** True when every consumed artifact was produced upstream first. */
  coherent: boolean;
}

/**
 * Walk the collaboration: each agent receives the accumulated shared context,
 * consumes the artifacts it needs and contributes its own. Reports the handoff
 * timeline and whether the context flowed coherently (no agent consuming an
 * artifact before it was produced).
 */
export function runCollaboration(c: AgentCollaboration): CollaborationRun {
  const context: string[] = [];
  const handoffs: Handoff[] = [];
  let caseCreated = false;
  let order = 0;

  for (const node of c.nodes) {
    if (node.kind === "case") { caseCreated = true; continue; }
    if (node.kind !== "agent") continue;

    const present = node.consumes.filter((a) => context.includes(a));
    const missing = node.consumes.filter((a) => !context.includes(a));
    if (!context.includes(node.produces)) context.push(node.produces);

    handoffs.push({
      order: order++,
      agent: node.agent,
      agentLabel: AGENT_LABEL[node.agent],
      role: node.role,
      produces: node.produces,
      consumes: present,
      missing,
      contextAfter: [...context],
    });
  }

  return {
    collaborationId: c.id,
    handoffs,
    sharedContext: context,
    caseCreated,
    coherent: handoffs.every((h) => h.missing.length === 0),
  };
}

/* ── Lowering to a runnable workflow ──────────────────────────────────────── */

/**
 * Lower a collaboration into a `WorkflowDefinition` so it runs on the execution
 * engine: each agent node becomes an agent step, the case node a case step.
 */
export function collaborationToDefinition(c: AgentCollaboration): WorkflowDefinition {
  const steps: WorkflowStepDef[] = [];
  for (const node of c.nodes) {
    if (node.kind === "agent") {
      steps.push({ id: newStepId(), type: "agent", agent: node.agent, label: node.role });
    } else if (node.kind === "case") {
      steps.push({ id: newStepId(), type: "case", label: node.label });
    }
  }
  // Close every collaboration with a report.
  steps.push({ id: newStepId(), type: "report", label: "Generate a collaboration report" });

  return {
    id: "draft",
    name: c.name,
    trigger: { kind: c.triggerKind },
    steps,
    enabled: false,
  };
}

export interface CollaborationStats {
  scenarios: number;
  /** Max agents collaborating in a single scenario. */
  maxAgents: number;
  /** Distinct agents that participate across all scenarios. */
  agentsInvolved: number;
}

export function collaborationStats(scenarios = COLLABORATIONS): CollaborationStats {
  const all = new Set<AgentKind>();
  let maxAgents = 0;
  for (const c of scenarios) {
    const agents = collaborationAgents(c);
    maxAgents = Math.max(maxAgents, agents.length);
    for (const a of agents) all.add(a);
  }
  return { scenarios: scenarios.length, maxAgents, agentsInvolved: all.size };
}
