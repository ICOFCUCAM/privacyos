/**
 * Recommendation → Case routing.
 *
 * When a user approves an AI recommendation, it should open a real, tracked unit
 * of remediation work (a Case) assigned to the owning agent — not just flip a
 * flag. This pure mapping turns a recommendation into the Case fields to create,
 * so approval kicks off actual work. Unit-tested and IO-free.
 */

import type { AgentKind, CaseType, RiskLevel } from "@/lib/types";

export interface RecommendationLike {
  id: string;
  agent: AgentKind;
  title: string;
  rationale: string;
  riskLevel: RiskLevel;
}

export interface NewCaseFields {
  type: CaseType;
  title: string;
  summary: string;
  riskLevel: RiskLevel;
  assignedAgent: AgentKind;
}

/** Which case type each agent's work opens when its recommendation is approved. */
const AGENT_CASE_TYPE: Record<AgentKind, CaseType> = {
  discovery: "data_broker_removal",
  privacy: "data_broker_removal",
  legal: "legal_request",
  reputation: "reputation_recovery",
  security: "breach_response",
  deepfake: "deepfake_incident",
  executive: "impersonation_takedown",
  business: "breach_response",
  // Coordination & response roles
  orchestrator: "breach_response",
  incident: "breach_response",
  compliance: "legal_request",
  threat_intel: "breach_response",
  vendor: "impersonation_takedown",
};

/**
 * Build the Case to open from an approved recommendation. The case inherits the
 * recommendation's risk and owning agent, and starts in progress (the agent is
 * actively working it once approved).
 */
export function caseFromRecommendation(rec: RecommendationLike): NewCaseFields {
  return {
    type: AGENT_CASE_TYPE[rec.agent] ?? "breach_response",
    title: rec.title,
    summary: rec.rationale,
    riskLevel: rec.riskLevel,
    assignedAgent: rec.agent,
  };
}
