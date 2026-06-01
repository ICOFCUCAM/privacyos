/**
 * Protection Suite — the cross-domain risk scorecard.
 *
 * Aggregates every protection module's headline score into one pane:
 * Executive, Family, Travel, Brand, Digital Identity and Reputation. Pure: it
 * composes the (pure) module engines, so it's the single place that knows the
 * whole posture. Unit-tested.
 */

import type { Exposure, Threat } from "@/lib/types";
import type { CredentialLeak, DomainRisk, EmployeeExposure, FamilyMember, Mention, ThirdPartyRisk, TravelAlert } from "@/lib/suite-types";
import { executiveRiskIndices } from "@/lib/executive/os/risk-indices";
import { familyOverview } from "@/lib/family/os/family-os";
import { assessTrips } from "@/lib/intelligence/travel-risk";
import { travelOverview } from "@/lib/travel/os/travel-os";
import { brandRiskIndices } from "@/lib/business/os/brand-os";
import { buildAccounts, identityRisk } from "@/lib/identity/os/identity-os";
import { reputationOverview } from "@/lib/reputation/os/analysis";

export type SuiteBand = "low" | "elevated" | "high" | "critical";

export interface DomainScore {
  key: string;
  label: string;
  href: string;
  /** 0–100. Interpretation depends on `higherIsWorse`. */
  score: number;
  band: SuiteBand;
  /** True for risk scores (higher = worse); false for health scores (higher = better). */
  higherIsWorse: boolean;
  caption: string;
}

export interface SuiteInput {
  exposures: Exposure[];
  threats: Threat[];
  mentions: Mention[];
  familyMembers: FamilyMember[];
  travelAlerts: TravelAlert[];
  credentialLeaks: CredentialLeak[];
  domainRisks: DomainRisk[];
  employeeExposures: EmployeeExposure[];
  thirdPartyRisks: ThirdPartyRisk[];
  subjectEmails: string[];
}

function riskBand(score: number): SuiteBand {
  if (score >= 75) return "critical";
  if (score >= 50) return "high";
  if (score >= 25) return "elevated";
  return "low";
}

/** A health score (higher = better) → its risk band (inverted). */
function healthBand(score: number): SuiteBand {
  return riskBand(100 - score);
}

const POSTURE_SCORE = { low: 15, guarded: 40, elevated: 65, high: 85 } as const;

/** The whole protection posture, one row per domain, worst risk first. */
export function protectionSuite(input: SuiteInput): DomainScore[] {
  const exec = executiveRiskIndices({ exposures: input.exposures, threats: input.threats, family: input.familyMembers, travel: input.travelAlerts, credentialLeaks: input.credentialLeaks });
  const family = familyOverview(input.familyMembers, input.exposures);
  const travel = travelOverview(assessTrips(input.travelAlerts, input.exposures, input.threats));
  const brand = brandRiskIndices({ domainRisks: input.domainRisks, employeeExposures: input.employeeExposures, thirdPartyRisks: input.thirdPartyRisks, credentialLeaks: input.credentialLeaks });
  const identity = identityRisk(buildAccounts({ credentialLeaks: input.credentialLeaks, exposures: input.exposures, knownEmails: input.subjectEmails }));
  const reputation = reputationOverview(input.mentions);

  const travelScore = POSTURE_SCORE[travel.highestPosture];

  const rows: DomainScore[] = [
    { key: "executive", label: "Executive", href: "/dashboard/executive", score: exec.overall, band: riskBand(exec.overall), higherIsWorse: true, caption: `${exec.band} risk` },
    { key: "family", label: "Family", href: "/dashboard/family", score: family.familyRisk, band: riskBand(family.familyRisk), higherIsWorse: true, caption: `${family.minors} minor(s) · ${family.alerts} alert(s)` },
    { key: "travel", label: "Travel", href: "/dashboard/travel", score: travelScore, band: riskBand(travelScore), higherIsWorse: true, caption: `${travel.upcoming} upcoming · ${travel.highestPosture} posture` },
    { key: "brand", label: "Brand", href: "/dashboard/business", score: brand.overall, band: riskBand(brand.overall), higherIsWorse: true, caption: `${brand.band} brand risk` },
    { key: "identity", label: "Identity", href: "/dashboard/identity", score: identity.overall, band: riskBand(identity.overall), higherIsWorse: true, caption: `${identity.breachedAccounts} breached account(s)` },
    { key: "reputation", label: "Reputation", href: "/dashboard/reputation", score: reputation.health, band: healthBand(reputation.health), higherIsWorse: false, caption: `${reputation.health}/100 health` },
  ];

  // Worst first: risk rows by score desc; reputation ranked by its inverted band.
  return rows.sort((a, b) => effectiveRisk(b) - effectiveRisk(a));
}

function effectiveRisk(d: DomainScore): number {
  return d.higherIsWorse ? d.score : 100 - d.score;
}

export interface SuiteSummary {
  domains: number;
  /** Domains at high/critical risk. */
  atRisk: number;
  worst: DomainScore | null;
}

export function summarizeSuite(rows: DomainScore[]): SuiteSummary {
  const atRisk = rows.filter((d) => d.band === "high" || d.band === "critical").length;
  return { domains: rows.length, atRisk, worst: rows[0] ?? null };
}
