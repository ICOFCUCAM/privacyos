/**
 * Unified scoring service.
 *
 * Produces the six PrivacyOS scores (privacy, identity, reputation, executive,
 * business, overall) on a consistent 0–100 risk scale (higher = more risk,
 * matching the exposure score). The identity/reputation/executive/business axes
 * are sourced from the canonical module engines so the dashboard, reports and
 * the Protection Suite agree on one number per domain. (The legacy standalone
 * sub-score functions below are retained for reference/back-compat.)
 */

import type { Exposure, RiskLevel, RiskScore, Threat } from "@/lib/types";
import type {
  CredentialLeak,
  DomainRisk,
  EmployeeExposure,
  FamilyMember,
  Incident,
  Mention,
  ScoreSet,
  ThirdPartyRisk,
  TravelAlert,
} from "@/lib/suite-types";
import { executiveRiskIndices } from "@/lib/executive/os/risk-indices";
import { brandRiskIndices } from "@/lib/business/os/brand-os";
import { identityRisk, buildAccounts } from "@/lib/identity/os/identity-os";
import { reputationOverview } from "@/lib/reputation/os/analysis";

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
  /** Inputs for the canonical module engines (identity/executive/business). */
  exposures?: Exposure[];
  threats?: Threat[];
  familyMembers?: FamilyMember[];
  travelAlerts?: TravelAlert[];
  thirdPartyRisks?: ThirdPartyRisk[];
  subjectEmails?: string[];
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

/**
 * Compute the full score set on a 0–100 risk scale. The identity, reputation,
 * executive and business axes are sourced from the canonical module engines so
 * every surface shows one consistent number per domain.
 */
export function computeScoreSet(inputs: ScoreInputs): ScoreSet {
  const mentions = inputs.mentions ?? [];
  const credentialLeaks = inputs.credentialLeaks ?? [];
  const exposures = inputs.exposures ?? [];

  const privacy = inputs.risk.overall;

  // Digital Identity OS — account-takeover risk.
  const identity = identityRisk(buildAccounts({ credentialLeaks, exposures, knownEmails: inputs.subjectEmails ?? [] })).overall;

  // ReputationOS — health (higher = better) inverted to a risk; no coverage → 0 risk.
  const reputation = mentions.length ? Math.max(0, Math.min(100, 100 - reputationOverview(mentions).health)) : 0;

  // Executive Protection OS — composite executive risk.
  const executive = executiveRiskIndices({ exposures, threats: inputs.threats ?? [], family: inputs.familyMembers ?? [], travel: inputs.travelAlerts ?? [], credentialLeaks }).overall;

  // Business/Brand OS — brand risk.
  const business = brandRiskIndices({ domainRisks: inputs.domainRisks ?? [], employeeExposures: inputs.employeeExposures ?? [], thirdPartyRisks: inputs.thirdPartyRisks ?? [], credentialLeaks }).overall;

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
