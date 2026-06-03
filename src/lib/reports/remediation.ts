/**
 * Remediation ledger — the "what we actually did about it" side of a report.
 *
 * Reports have always shown risk *state* (exposures, threats, scores). A
 * regulator, insurer or board also needs the *proof of work*: the autonomous
 * actions the engine took, the legal instruments drafted, the removals filed —
 * each backed by a tamper-evident Evidence Vault record. This module aggregates
 * the real ledgers the engine now writes (evidence, legal_requests, removals,
 * agent actions, cases) into report-ready stats + sections. Pure + unit-tested.
 */

import { shortHash, type EvidenceItem } from "@/lib/intelligence/evidence-vault";
import type { AgentAction, LegalRequest } from "@/lib/suite-types";
import type { Case, RemovalRequest } from "@/lib/types";
import { titleCase } from "@/lib/ui";

export interface RemediationLedger {
  /** Tamper-evident artifacts sealed into the Evidence Vault. */
  evidenceSealed: number;
  /** Legal instruments still in draft/ready (awaiting send). */
  legalDrafted: number;
  /** Legal instruments sent (submitted/acknowledged/completed). */
  legalSubmitted: number;
  /** Broker opt-outs in flight (requested/in progress). */
  removalsFiled: number;
  /** Listings confirmed removed. */
  removalsRemoved: number;
  casesOpen: number;
  casesResolved: number;
  /** Completed autonomous agent actions. */
  actionsTaken: number;
}

export interface ReportSection {
  heading: string;
  rows: { label: string; value: string }[];
}

export interface RemediationInput {
  evidence: EvidenceItem[];
  legalRequests: LegalRequest[];
  removals: RemovalRequest[];
  agentActions: AgentAction[];
  cases: Case[];
}

const REMOVAL_ACTIVE = new Set<RemovalRequest["status"]>(["removal_requested", "in_progress"]);
const LEGAL_SENT = new Set<LegalRequest["status"]>(["submitted", "acknowledged", "completed"]);
const LEGAL_PENDING = new Set<LegalRequest["status"]>(["draft", "ready"]);

/** Roll the engine's real ledgers up into a remediation summary. */
export function remediationLedger(input: RemediationInput): RemediationLedger {
  return {
    evidenceSealed: input.evidence.length,
    legalDrafted: input.legalRequests.filter((l) => LEGAL_PENDING.has(l.status)).length,
    legalSubmitted: input.legalRequests.filter((l) => LEGAL_SENT.has(l.status)).length,
    removalsFiled: input.removals.filter((r) => REMOVAL_ACTIVE.has(r.status)).length,
    removalsRemoved: input.removals.filter((r) => r.status === "removed").length,
    casesOpen: input.cases.filter((c) => c.status !== "resolved").length,
    casesResolved: input.cases.filter((c) => c.status === "resolved").length,
    actionsTaken: input.agentActions.filter((a) => a.status === "completed").length,
  };
}

/** The "Remediation performed" proof-of-work section. */
export function remediationSection(l: RemediationLedger): ReportSection {
  return {
    heading: "Remediation performed",
    rows: [
      { label: "Autonomous actions executed", value: `${l.actionsTaken}` },
      { label: "Broker removals", value: `${l.removalsFiled} in flight · ${l.removalsRemoved} removed` },
      { label: "Legal instruments", value: `${l.legalDrafted} drafted · ${l.legalSubmitted} sent` },
      { label: "Cases", value: `${l.casesOpen} open · ${l.casesResolved} resolved` },
      { label: "Evidence sealed (SHA-256)", value: `${l.evidenceSealed} artifact(s)` },
    ],
  };
}

/**
 * Sealed-evidence section with chain-of-custody fingerprints — the artifact a
 * regulator/insurer can verify. Lists the newest items; collapses to a single
 * line when the vault is empty.
 */
export function evidenceSection(evidence: EvidenceItem[], limit = 8): ReportSection {
  if (evidence.length === 0) {
    return { heading: "Sealed evidence (chain of custody)", rows: [{ label: "No sealed evidence yet", value: "The vault populates as the engine acts" }] };
  }
  return {
    heading: "Sealed evidence (chain of custody)",
    rows: evidence.slice(0, limit).map((e) => ({
      label: e.title,
      value: `${titleCase(e.kind)} · ${titleCase(e.collectedBy)} · ${shortHash(e.hash)}`,
    })),
  };
}
