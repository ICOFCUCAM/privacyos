/**
 * Agent orchestration layer.
 *
 * The orchestrator is the engine behind the flagship "Protect me" experience:
 * the user expresses intent, and a fleet of specialized agents runs
 * concurrently over their footprint, returning consolidated findings and
 * prioritized recommendations. The user sees outcomes, not complexity.
 */

import type {
  AgentKind,
  AgentState,
  Exposure,
  Recommendation,
  Subject,
  Threat,
} from "@/lib/types";
import { computeRiskScore } from "@/lib/scoring/risk-score";
import { resolveProvider, type LLMProvider } from "./llm/provider";
import type { AgentContext, AgentResult, BaseAgent } from "./base-agent";
import { DiscoveryAgent } from "./discovery-agent";
import { PrivacyAgent } from "./privacy-agent";
import { LegalAgent } from "./legal-agent";
import { ReputationAgent } from "./reputation-agent";
import { SecurityAgent } from "./security-agent";
import { DeepfakeAgent } from "./deepfake-agent";
import { ExecutiveAgent } from "./executive-agent";
import { BusinessAgent } from "./business-agent";
import { OrchestratorAgent } from "./orchestrator-agent";
import { IncidentAgent } from "./incident-agent";
import { ComplianceAgent } from "./compliance-agent";
import { ThreatIntelAgent } from "./threat-intel-agent";
import { VendorAgent } from "./vendor-agent";

export function allAgents(): BaseAgent[] {
  return [
    // Domain specialists
    new DiscoveryAgent(),
    new PrivacyAgent(),
    new LegalAgent(),
    new ReputationAgent(),
    new SecurityAgent(),
    new DeepfakeAgent(),
    new ExecutiveAgent(),
    new BusinessAgent(),
    // Coordination & response roles
    new OrchestratorAgent(),
    new IncidentAgent(),
    new ComplianceAgent(),
    new ThreatIntelAgent(),
    new VendorAgent(),
  ];
}

/** Total number of agents in the fleet — single source of truth for UI counts. */
export const AGENT_COUNT = allAgents().length;

export interface ProtectInput {
  subject: Subject;
  exposures: Exposure[];
  threats: Threat[];
  /** Restrict the run to specific agents; defaults to all. */
  only?: AgentKind[];
  provider?: LLMProvider;
  now?: number;
}

export interface ProtectOutcome {
  subjectId: string;
  ranAt: string;
  riskBefore: number;
  /** Projected score after applying every recommendation (priority view). */
  projectedRisk: number;
  recommendations: Recommendation[];
  newFindings: Exposure[];
  newThreats: Threat[];
  agentStates: AgentState[];
  log: string[];
}

/**
 * Run the full protection cycle. Agents are executed concurrently; failures are
 * isolated so one failing agent never takes down the run.
 */
export async function protect(input: ProtectInput): Promise<ProtectOutcome> {
  const now = input.now ?? Date.now();
  const llm = input.provider ?? resolveProvider();
  const agents = allAgents().filter((a) => !input.only || input.only.includes(a.kind));

  const ctx: AgentContext = {
    subject: input.subject,
    exposures: input.exposures,
    threats: input.threats,
    llm,
    now,
  };

  const settled = await Promise.allSettled(agents.map((a) => a.run(ctx)));

  const recommendations: Recommendation[] = [];
  const newFindings: Exposure[] = [];
  const newThreats: Threat[] = [];
  const log: string[] = [];
  const agentStates: AgentState[] = [];

  settled.forEach((outcome, i) => {
    const agent = agents[i];
    if (outcome.status === "fulfilled") {
      const r: AgentResult = outcome.value;
      recommendations.push(...r.recommendations);
      newFindings.push(...r.findings);
      newThreats.push(...r.threats);
      log.push(...r.log.map((l) => `[${agent.kind}] ${l}`));
      agentStates.push({
        kind: agent.kind,
        name: agent.name,
        description: agent.description,
        status: "idle",
        lastRunAt: new Date(now).toISOString(),
        itemsHandled: r.recommendations.length + r.findings.length + r.threats.length,
      });
    } else {
      log.push(`[${agent.kind}] ERROR: ${outcome.reason}`);
      agentStates.push({
        kind: agent.kind,
        name: agent.name,
        description: agent.description,
        status: "error",
        lastRunAt: new Date(now).toISOString(),
        itemsHandled: 0,
      });
    }
  });

  // Sort recommendations by projected impact, highest first.
  recommendations.sort((a, b) => b.impact - a.impact);

  const riskBefore = computeRiskScore(input.exposures, input.threats, [], now).overall;
  const totalImpact = recommendations.reduce((s, r) => s + r.impact, 0);
  const projectedRisk = Math.max(0, riskBefore - totalImpact);

  return {
    subjectId: input.subject.id,
    ranAt: new Date(now).toISOString(),
    riskBefore,
    projectedRisk,
    recommendations,
    newFindings,
    newThreats,
    agentStates,
    log,
  };
}
