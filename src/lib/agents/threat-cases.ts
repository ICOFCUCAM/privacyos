/**
 * Threat → Case routing.
 *
 * A high- or critical-severity threat is real remediation work and should open
 * a tracked Case automatically — so the case queue (and Mission Control) feeds
 * itself from live detections instead of waiting for a human to file one. This
 * pure mapping turns a threat into the Case fields to create, assigned to the
 * right responding agent. IO-free and unit-tested.
 */

import type { AgentKind, CaseType, RiskLevel, ThreatKind } from "@/lib/types";
import type { NewCaseFields } from "./recommendation-routing";

export interface ThreatLike {
  subjectId: string;
  kind: ThreatKind;
  title: string;
  detail: string;
  riskLevel: RiskLevel;
}

/** Which case type + responding agent each threat kind opens. */
const THREAT_ROUTE: Record<ThreatKind, { type: CaseType; agent: AgentKind }> = {
  credential_leak: { type: "breach_response", agent: "security" },
  dark_web_mention: { type: "breach_response", agent: "threat_intel" },
  deepfake: { type: "deepfake_incident", agent: "deepfake" },
  impersonation: { type: "impersonation_takedown", agent: "deepfake" },
  doxxing: { type: "breach_response", agent: "incident" },
  location_exposure: { type: "data_broker_removal", agent: "privacy" },
  negative_press: { type: "reputation_recovery", agent: "reputation" },
};

/** Only high/critical threats warrant an auto-opened case. */
export function shouldOpenCaseForThreat(t: { riskLevel: RiskLevel }): boolean {
  return t.riskLevel === "high" || t.riskLevel === "critical";
}

/** Build the Case fields to open from a threat. */
export function caseFromThreat(t: ThreatLike): NewCaseFields {
  const route = THREAT_ROUTE[t.kind] ?? { type: "breach_response" as CaseType, agent: "incident" as AgentKind };
  return {
    type: route.type,
    title: t.title,
    summary: t.detail,
    riskLevel: t.riskLevel,
    assignedAgent: route.agent,
  };
}

/**
 * From a batch of newly-discovered threats, the cases to open: high/critical
 * only, skipping any whose title already has an open case (dedupe), and
 * de-duplicated within the batch itself.
 */
export function casesForNewThreats(
  threats: ThreatLike[],
  existingOpenTitles: Iterable<string> = [],
): NewCaseFields[] {
  const seen = new Set<string>(existingOpenTitles);
  const out: NewCaseFields[] = [];
  for (const t of threats) {
    if (!shouldOpenCaseForThreat(t)) continue;
    if (seen.has(t.title)) continue;
    seen.add(t.title);
    out.push(caseFromThreat(t));
  }
  return out;
}
