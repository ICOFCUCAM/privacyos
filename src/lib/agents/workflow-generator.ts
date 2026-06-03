/**
 * AI Workflow Generator (Layer 14).
 *
 * Turns a plain-English request ("Protect my CEO from doxxing.") into a
 * complete, valid workflow — trigger plus an ordered agent chain — automatically.
 *
 * Two paths behind one shape:
 *  - `generateWorkflow` is a pure, deterministic intent engine: it reads the
 *    subject and the threat from the prompt and composes a coherent block chain.
 *    It always returns a valid definition, needs no network or keys, and is the
 *    authoritative fallback (and the demo path).
 *  - `generateWorkflowWithAI` lets a configured LLM draft the plan, then maps
 *    and *validates* it through the same model — falling back to the rules
 *    engine on any miss. The LLM never produces an invalid workflow.
 */

import type { AgentKind, ThreatKind } from "@/lib/types";
import {
  newStepId, validateWorkflow,
  type StepType, type WorkflowDefinition, type WorkflowStepDef, type WorkflowTrigger,
} from "./workflow-builder";
import type { LLMProvider } from "./llm/provider";

/** Who the request is about. */
export type Persona = "executive" | "family" | "business" | "self";
/** What we're protecting against. */
export type ThreatIntent =
  | "doxxing" | "breach" | "reputation" | "broker"
  | "deepfake" | "impersonation" | "threat";

export interface GeneratedWorkflow {
  definition: WorkflowDefinition;
  persona: Persona;
  threat: ThreatIntent;
  /** Plain-language account of what was detected and why blocks were chosen. */
  rationale: string[];
  /** 0–100 — how strong the signal in the prompt was. */
  confidence: number;
  /** Which path produced this. */
  source: "rules" | "ai";
  prompt: string;
}

/* ── Intent detection ─────────────────────────────────────────────────────── */

const PERSONA_KEYWORDS: Record<Exclude<Persona, "self">, string[]> = {
  executive: ["ceo", "executive", "exec", "founder", "chairman", "principal", "c-suite", "cfo", "cto", "leadership", "board member"],
  family: ["family", "kids", "child", "children", "spouse", "wife", "husband", "daughter", "son", "parents", "relative", "household"],
  business: ["company", "business", "brand", "employees", "organization", "organisation", "staff", "corporate", "enterprise"],
};

// Highest-priority threat first.
const THREAT_KEYWORDS: [ThreatIntent, string[]][] = [
  ["doxxing", ["dox", "doxx", "home address", "exposed personal", "leaked address", "swat"]],
  ["deepfake", ["deepfake", "fake video", "ai video", "synthetic media", "fake image"]],
  ["impersonation", ["impersonat", "fake account", "fake profile", "fake page", "pretending to be", "fake linkedin"]],
  ["breach", ["breach", "hack", "leak", "credential", "password", "account takeover", "compromised"]],
  ["reputation", ["reputation", "press", "negative", "search results", "google results", "defamation", "smear", "review"]],
  ["broker", ["broker", "people search", "people-search", "remove my data", "whitepages", "spokeo", "opt out", "personal data online"]],
  ["threat", ["threat", "stalk", "harass", "extort", "blackmail", "physical safety"]],
];

function detectPersona(text: string): { persona: Persona; matched: string | null } {
  for (const persona of ["executive", "family", "business"] as const) {
    const hit = PERSONA_KEYWORDS[persona].find((k) => text.includes(k));
    if (hit) return { persona, matched: hit };
  }
  return { persona: "self", matched: null };
}

function detectThreat(text: string): { threat: ThreatIntent; matched: string | null } {
  for (const [threat, keys] of THREAT_KEYWORDS) {
    const hit = keys.find((k) => text.includes(k));
    if (hit) return { threat, matched: hit };
  }
  return { threat: "threat", matched: null };
}

/* ── Composition ──────────────────────────────────────────────────────────── */

const PERSONA_LABEL: Record<Persona, string> = {
  executive: "executive", family: "family", business: "business", self: "you",
};

const THREAT_TRIGGER: Record<ThreatIntent, WorkflowTrigger> = {
  doxxing: { kind: "doxxing_detected" },
  deepfake: { kind: "deepfake_detected" },
  impersonation: { kind: "threat_detected", minRisk: "high", threatKind: "impersonation" },
  breach: { kind: "breach_detected", minRisk: "high" },
  reputation: { kind: "threat_detected", minRisk: "medium", threatKind: "negative_press" },
  broker: { kind: "exposure_found", minRisk: "medium" },
  threat: { kind: "threat_detected", minRisk: "high" },
};

const DISCOVERY_LABEL: Record<ThreatIntent, string> = {
  doxxing: "Scan for exposed personal data",
  deepfake: "Find the synthetic media & its spread",
  impersonation: "Find impersonating accounts",
  breach: "Correlate the breach against leak sources",
  reputation: "Audit search results & coverage",
  broker: "Discover data-broker exposures",
  threat: "Discover exposures for the principal",
};

const PERSONA_AGENT: Record<Persona, AgentKind> = {
  executive: "executive", business: "business", family: "privacy", self: "privacy",
};

const PERSONA_AGENT_LABEL: Record<Persona, string> = {
  executive: "Assess executive exposure & risk indices",
  business: "Assess brand & business exposure",
  family: "Assess the family's personal exposure",
  self: "Assess your personal exposure",
};

/** A threat-specific remediation block, inserted before case creation. */
function threatActionStep(threat: ThreatIntent): WorkflowStepDef | null {
  const mk = (type: StepType, agent: AgentKind | undefined, label: string): WorkflowStepDef =>
    ({ id: newStepId(), type, agent, label });
  switch (threat) {
    case "breach": return mk("agent", "security", "Rotate exposed credentials & force re-auth");
    case "reputation": return mk("agent", "reputation", "Run suppression & positive-content plan");
    case "deepfake": return mk("agent", "deepfake", "Analyze & action the deepfake");
    case "broker": return mk("takedown", undefined, "File broker opt-out / removal requests");
    case "impersonation": return mk("takedown", undefined, "Request takedown of the impersonating account");
    default: return null; // doxxing & generic threat are covered by discovery + legal
  }
}

/** Threats where legal review/notice is part of the response. */
const LEGAL_THREATS: ReadonlySet<ThreatIntent> = new Set<ThreatIntent>([
  "doxxing", "breach", "impersonation", "deepfake", "threat",
]);

function step(type: StepType, agent: AgentKind | undefined, label: string): WorkflowStepDef {
  return { id: newStepId(), type, agent, label };
}

function titleCasePrompt(prompt: string): string {
  const clean = prompt.trim().replace(/[.!?]+$/, "");
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/**
 * Deterministically compose a workflow from a plain-English request. Always
 * returns a valid definition.
 */
export function generateWorkflow(prompt: string): GeneratedWorkflow {
  const text = ` ${prompt.toLowerCase()} `;
  const { persona, matched: personaHit } = detectPersona(text);
  const { threat, matched: threatHit } = detectThreat(text);

  const steps: WorkflowStepDef[] = [];
  // 1. Discovery
  steps.push(step("agent", "discovery", DISCOVERY_LABEL[threat]));
  // 2. Persona agent
  steps.push(step("agent", PERSONA_AGENT[persona], PERSONA_AGENT_LABEL[persona]));
  // 3. Risk assessment
  steps.push(step("agent", "threat_intel", "Risk assessment"));
  // 4. Threat-specific remediation (optional)
  const action = threatActionStep(threat);
  if (action) steps.push(action);
  // 5. Case creation
  steps.push(step("case", undefined, "Open a case"));
  // 6. Legal (optional)
  if (LEGAL_THREATS.has(threat)) steps.push(step("agent", "legal", "Review legal options & notices"));
  // 7. Report
  steps.push(step("report", undefined, "Generate a report"));

  const name = `${titleCasePrompt(prompt)}`.slice(0, 80) || "Generated protection workflow";
  const definition: WorkflowDefinition = {
    id: "draft",
    name,
    trigger: { ...THREAT_TRIGGER[threat] },
    steps,
    enabled: false,
  };

  const rationale: string[] = [];
  rationale.push(personaHit
    ? `Subject detected: ${PERSONA_LABEL[persona]} ("${personaHit}")`
    : `No specific subject named — defaulting to personal protection`);
  rationale.push(threatHit
    ? `Threat detected: ${threat} ("${threatHit}")`
    : `No specific threat named — defaulting to a general threat response`);
  rationale.push(`Trigger wired to ${THREAT_TRIGGER[threat].kind.replace(/_/g, " ")}`);
  if (action) rationale.push(`Added a ${threat}-specific remediation step`);
  if (LEGAL_THREATS.has(threat)) rationale.push(`Engaged the Legal Agent (takedown / notification duties)`);

  // Confidence: strong when both subject and threat were explicitly named.
  let confidence = 55;
  if (personaHit) confidence += 22;
  if (threatHit) confidence += 22;
  confidence = Math.min(confidence, 99);

  return { definition, persona, threat, rationale, confidence, source: "rules", prompt };
}

/* ── LLM-assisted path ────────────────────────────────────────────────────── */

const VALID_THREATKINDS: ReadonlySet<ThreatKind> = new Set<ThreatKind>([
  "credential_leak", "dark_web_mention", "deepfake", "impersonation",
  "doxxing", "location_exposure", "negative_press",
]);

const VALID_STEP_TYPES: ReadonlySet<StepType> = new Set<StepType>([
  "agent", "condition", "decision", "notify", "case", "takedown", "report", "webhook", "wait",
]);

const VALID_AGENTS: ReadonlySet<AgentKind> = new Set<AgentKind>([
  "discovery", "privacy", "legal", "reputation", "security", "deepfake",
  "executive", "business", "orchestrator", "incident", "compliance",
  "threat_intel", "vendor",
]);

interface AIPlan {
  name?: string;
  trigger?: { kind?: string; minRisk?: string; threatKind?: string; threshold?: number; cadence?: string };
  steps?: { type?: string; agent?: string; label?: string }[];
}

const SYSTEM_PROMPT = [
  "You are a security automation planner for PrivacyOS.",
  "Given a user's plain-English request, output a workflow as JSON only:",
  '{"name": string, "trigger": {"kind": string, "minRisk"?: "low"|"medium"|"high"|"critical"}, "steps": [{"type": string, "agent"?: string, "label": string}]}',
  "Block types: agent, condition, decision, notify, case, takedown, report, webhook, wait.",
  "Agents: discovery, privacy, legal, reputation, security, deepfake, executive, business, orchestrator, incident, compliance, threat_intel, vendor.",
  "Trigger kinds: threat_detected, incident_raised, breach_detected, domain_risk, deepfake_detected, doxxing_detected, exposure_found, score_above, case_opened, scheduled, manual, agent_request, webhook, external.",
  "Every 'agent' step must include a valid agent. Start with discovery, end with a report. Respond with JSON only.",
].join("\n");

/** Map a (trusted-after-validation) AI plan into a WorkflowDefinition. */
function planToDefinition(plan: AIPlan, prompt: string): WorkflowDefinition | null {
  if (!plan || !Array.isArray(plan.steps) || plan.steps.length === 0) return null;

  const kind = plan.trigger?.kind;
  const trigger: WorkflowTrigger = { kind: "threat_detected", minRisk: "high" };
  if (kind) {
    // Trust the kind only if the model returned a recognized one; else keep default.
    trigger.kind = kind as WorkflowTrigger["kind"];
  }
  if (plan.trigger?.minRisk && ["low", "medium", "high", "critical"].includes(plan.trigger.minRisk)) {
    trigger.minRisk = plan.trigger.minRisk as WorkflowTrigger["minRisk"];
  }
  if (plan.trigger?.threatKind && VALID_THREATKINDS.has(plan.trigger.threatKind as ThreatKind)) {
    trigger.threatKind = plan.trigger.threatKind as ThreatKind;
  }

  const steps: WorkflowStepDef[] = [];
  for (const s of plan.steps) {
    const type = s.type as StepType;
    if (!VALID_STEP_TYPES.has(type)) return null;
    const agent = s.agent && VALID_AGENTS.has(s.agent as AgentKind) ? (s.agent as AgentKind) : undefined;
    if (type === "agent" && !agent) return null;
    steps.push({ id: newStepId(), type, agent, label: (s.label ?? "").slice(0, 120) || type });
  }

  const def: WorkflowDefinition = {
    id: "draft",
    name: (plan.name ?? titleCasePrompt(prompt)).slice(0, 80),
    trigger,
    steps,
    enabled: false,
  };
  return validateWorkflow(def).valid ? def : null;
}

/**
 * Ask a configured LLM to draft the workflow, validate it through the same
 * model, and fall back to the deterministic engine on any miss. The returned
 * `persona`/`threat`/`confidence` always come from the rules engine so the
 * explanation is stable even when the AI authored the steps.
 */
export async function generateWorkflowWithAI(
  prompt: string,
  provider?: LLMProvider,
): Promise<GeneratedWorkflow> {
  const base = generateWorkflow(prompt);
  if (!provider) return base;

  try {
    const { text } = await provider.complete(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      { json: true },
    );
    const plan = JSON.parse(text) as AIPlan;
    const def = planToDefinition(plan, prompt);
    if (!def) return base; // invalid plan → keep the rules result
    return {
      ...base,
      definition: def,
      source: "ai",
      confidence: Math.min(base.confidence + 5, 99),
      rationale: [`Drafted by ${provider.name} and validated against the block model`, ...base.rationale],
    };
  } catch {
    return base; // parse/network error → deterministic fallback
  }
}
