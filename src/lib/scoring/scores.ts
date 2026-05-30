/**
 * Unified scoring service.
 *
 * Produces the six PrivacyOS scores (privacy, identity, reputation, executive,
 * business, overall) on a consistent 0–100 risk scale (higher = more risk,
 * matching the exposure score). Each sub-score is a pure, explainable function
 * of its inputs so it can be audited and shown in board/compliance reports.
 */

import type { RiskLevel, RiskScore } from "@/lib/types";
import type {
  CredentialLeak,
  DomainRisk,
  EmployeeExposure,
  Incident,
  Mention,
  ScoreSet,
} from "@/lib/suite-types";

const LEVEL: Record<RiskLevel, number> = { low: 8, medium: 20, high: 38, critical: 60 };

/** Logistic compression of an unbounded accumulation to 0–100. */
function compress(raw: number, k = 90): number {
  return Math.round(Math.min(100, Math.max(0, 100 * (1 - Math.exp(-raw / k)))));
}

export interface ScoreInputs {
  risk: RiskScore;
  mentions?: Mention[];
  incidents?: Incident[];
  credentialLeaks?: CredentialLeak[];
  domainRisks?: DomainRisk[];
  employeeExposures?: EmployeeExposure[];
}

/** Reputation risk from negative/defamatory mentions and poor search ranks. */
export function reputationScore(mentions: Mention[] = []): number {
  let raw = 0;
  for (const m of mentions) {
    if (m.sentiment === "negative") raw += 14 * (1 - m.sentimentScore); // sentimentScore in -1..1
    if (m.isDefamatory) raw += 30;
    if (m.searchRank && m.searchRank <= 3 && m.sentiment === "negative") raw += 20; // page-one harm
  }
  return compress(raw, 110);
}

/** Executive (VIP) risk from active personal-safety incidents. */
export function executiveScore(incidents: Incident[] = []): number {
  let raw = 0;
  for (const i of incidents) {
    if (i.status === "resolved" || i.status === "dismissed") continue;
    let w = LEVEL[i.riskLevel];
    if (["doxxing", "location_exposure"].includes(i.kind)) w *= 1.4;
    if (["deepfake", "impersonation"].includes(i.kind)) w *= 1.2;
    raw += w;
  }
  return compress(raw, 120);
}

/** Organization risk from credential leaks, domain risks and employee exposure. */
export function businessScore(
  leaks: CredentialLeak[] = [],
  domainRisks: DomainRisk[] = [],
  employeeExposures: EmployeeExposure[] = [],
): number {
  let raw = 0;
  for (const l of leaks) raw += LEVEL[l.riskLevel];
  for (const d of domainRisks) if (!d.resolved) raw += LEVEL[d.riskLevel] * 0.8;
  for (const e of employeeExposures) raw += LEVEL[e.riskLevel] * 0.6;
  return compress(raw, 160);
}

/** Compute the full score set. */
export function computeScoreSet(inputs: ScoreInputs): ScoreSet {
  const privacy = inputs.risk.overall;
  const identity = inputs.risk.identity;
  const reputation = reputationScore(inputs.mentions);
  const executive = executiveScore(inputs.incidents);
  const business = businessScore(
    inputs.credentialLeaks,
    inputs.domainRisks,
    inputs.employeeExposures,
  );

  // Overall weights the consumer-facing axes most heavily, with org risk folded in.
  const overall = Math.round(
    privacy * 0.3 +
      identity * 0.15 +
      reputation * 0.2 +
      executive * 0.2 +
      business * 0.15,
  );

  return { privacy, identity, reputation, executive, business, overall };
}
