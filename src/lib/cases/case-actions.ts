/**
 * Case → downstream work planner.
 *
 * A Case should not be an empty folder. When one is opened, it should spawn the
 * concrete remediation it implies: a data-broker-removal case files the opt-outs,
 * a legal/reputation/impersonation case drafts the matching legal instrument.
 * (Evidence is linked automatically — the Evidence Vault aggregates a case's
 * related exposures.)
 *
 * This module is the pure, IO-free decision: given the new case and the subject's
 * footprint, it returns the removals to file and the legal document to draft. The
 * data source persists the result. Unit-tested; no side effects.
 */

import { generateLegalDoc } from "@/lib/legal/engine";
import { planAutoFilings } from "@/lib/brokers/auto-file";
import type { LegalRequestType } from "@/lib/suite-types";
import type { CaseType, Exposure, RemovalRequest, RiskLevel } from "@/lib/types";

export interface CaseActionInput {
  type: CaseType;
  title: string;
  subjectId: string;
}

export interface CaseActionContext {
  subjectName: string;
  exposures: Exposure[];
  existingRemovals: RemovalRequest[];
  now?: string;
  /** Cap on how many removals a single case may auto-file (safety valve). */
  maxRemovals?: number;
}

export interface PlannedLegalDoc {
  type: LegalRequestType;
  recipient: string;
  body: string;
}

export interface CaseActionPlan {
  /** Broker opt-outs to file (ready to persist). */
  removals: Omit<RemovalRequest, "id">[];
  /** Exposure ids this case now demonstrably acts on (for evidence linking). */
  relatedExposureIds: string[];
  /** A legal instrument to draft, if this case type warrants one. */
  legal?: PlannedLegalDoc;
}

/** The legal instrument (if any) each case type should auto-draft on open. */
const CASE_LEGAL_TYPE: Partial<Record<CaseType, LegalRequestType>> = {
  data_broker_removal: "broker_optout",
  legal_request: "gdpr_erasure",
  reputation_recovery: "defamation_complaint",
  impersonation_takedown: "platform_abuse",
  deepfake_incident: "platform_abuse",
  executive_protection: "privacy_violation",
  // breach_response is handled operationally (rotation/lockdown), not by a letter.
};

const RISK_ORDER: Record<RiskLevel, number> = { critical: 3, high: 2, medium: 1, low: 0 };
const REMOVABLE_SOURCES = new Set<Exposure["source"]>(["data_broker", "public_record", "search_engine"]);

/** Pick the most relevant recipient for a drafted letter from the footprint. */
function pickRecipient(legalType: LegalRequestType, exposures: Exposure[]): string {
  const pool =
    legalType === "broker_optout"
      ? exposures.filter((e) => REMOVABLE_SOURCES.has(e.source))
      : exposures;
  const top = [...pool].sort((a, b) => RISK_ORDER[b.riskLevel] - RISK_ORDER[a.riskLevel])[0];
  return top?.sourceName ?? "The record holder";
}

/**
 * Decide the concrete work a newly-opened case should kick off. Broker-removal
 * cases file the matching opt-outs (deduped against what's already in flight and
 * capped); cases with a legal dimension draft the appropriate document.
 */
export function planCaseActions(c: CaseActionInput, ctx: CaseActionContext): CaseActionPlan {
  const plan: CaseActionPlan = { removals: [], relatedExposureIds: [] };

  if (c.type === "data_broker_removal") {
    const { requests } = planAutoFilings(c.subjectId, ctx.exposures, ctx.existingRemovals, {
      now: ctx.now,
      maxNew: ctx.maxRemovals ?? 5,
    });
    plan.removals = requests;
    plan.relatedExposureIds = requests
      .map((r) => r.exposureId)
      .filter((id): id is string => Boolean(id));
  }

  const legalType = CASE_LEGAL_TYPE[c.type];
  if (legalType) {
    const recipient = pickRecipient(legalType, ctx.exposures);
    const { body } = generateLegalDoc({
      type: legalType,
      subjectName: ctx.subjectName,
      recipient,
      matter: c.title,
    });
    plan.legal = { type: legalType, recipient, body };
  }

  return plan;
}
