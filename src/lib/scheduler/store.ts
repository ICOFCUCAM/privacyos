/**
 * Scheduler persistence abstraction.
 *
 * `runScheduledCycle` depends on this interface, not on Supabase directly, so
 * the always-on logic is unit-testable with an in-memory store and the live
 * implementation (service-role) is a thin adapter. Every method is multi-tenant:
 * the userId is passed explicitly because the scheduler runs without a session.
 */

import type {
  AgentActionKind,
  CredentialLeak,
  DomainRisk,
  EmployeeExposure,
  FamilyMember,
  Incident,
  LegalRequestType,
  Mention,
  NotificationKind,
  ScoreKind,
  SentimentDay,
  TravelAlert,
} from "@/lib/suite-types";
import type {
  Case,
  Exposure,
  Recommendation,
  RemovalRequest,
  RiskLevel,
  Subject,
  Threat,
} from "@/lib/types";
import type { ProtectOutcome } from "@/lib/agents/orchestrator";
import type { NewCaseFields } from "@/lib/agents/recommendation-routing";
import type { AssessedRisk } from "@/lib/domains/dns";
import type { EvidenceItem } from "@/lib/intelligence/evidence-vault";

export interface Footprint {
  userId: string;
  subject: Subject;
  exposures: Exposure[];
  threats: Threat[];
  /** The principal's family roster — feeds executive family/physical risk and
   *  the family-protection cascade. Optional so callers can omit when absent. */
  family?: FamilyMember[];
  /** The principal's travel itinerary — feeds executive travel risk. */
  travel?: TravelAlert[];
  /** Leaked credentials (dark-web/breach feed) — drives ATO breach cases and the
   *  digital/dark-web indices. */
  credentialLeaks?: CredentialLeak[];
  /** Workforce exposure (org-scoped) — drives doxxing + employee breach cases. */
  employeeExposures?: EmployeeExposure[];
  /** Open incidents — feeds the impersonation/deepfake correlation. */
  incidents?: Incident[];
  /** Domain risks (org-scoped) — feeds lookalike/phishing impersonation signals. */
  domainRisks?: DomainRisk[];
  /** The subject's currently-open cases — drives the response-SLA clock. */
  cases?: Case[];
}

export interface NewAgentAction {
  agent: ProtectOutcome["agentStates"][number]["kind"];
  kind: AgentActionKind;
  summary: string;
  status: string;
}

export interface NewNotification {
  kind: NotificationKind;
  title: string;
  body: string;
  riskLevel?: RiskLevel;
}

export interface ScoreEntry {
  kind: ScoreKind;
  value: number;
}

/** A legal instrument auto-drafted from a newly-opened case, ready to persist. */
export interface NewLegalDraft {
  type: LegalRequestType;
  recipient: string;
  body: string;
  /** The case this draft was generated for (for the audit trail). */
  caseTitle?: string;
}

export interface ScheduledRunSummary {
  subjectsProcessed: number;
  newExposures: number;
  newThreats: number;
  recommendations: number;
  removalsAdvanced: number;
  /** New broker opt-outs auto-filed from discovered exposures this cycle. */
  removalsFiled: number;
  /** Cases auto-opened from new high/critical threats this cycle. */
  casesOpened: number;
  /** Reputation-recovery cases auto-opened from negative/defamatory coverage. */
  reputationCasesOpened: number;
  /** Times the principal was escalated to critical executive risk this cycle. */
  executiveEscalations: number;
  /** Protective cases auto-opened for escalating/harassment threat actors. */
  executiveCasesOpened: number;
  /** Doxxing leaks routed to a takedown channel this cycle. */
  doxxingTakedownsRouted: number;
  /** Active impersonation/deepfake signals tracked this cycle. */
  impersonationSignals: number;
  /** Active dark-web signals monitored this cycle. */
  darkWebSignals: number;
  /** Live (chainable) attack paths detected this cycle. */
  attackPathsLive: number;
  /** Response playbooks executed end-to-end (no step needed a human) this cycle. */
  playbooksAutoExecuted: number;
  /** Playbooks that ran but paused at least one step for the customer's sign-off. */
  playbooksAwaitingApproval: number;
  /** Autonomous actions sealed into the Evidence Vault this cycle. */
  evidenceSealed: number;
  /** Legal instruments auto-drafted from newly-opened cases this cycle. */
  legalDrafted: number;
  /** Family-protection cases auto-opened from household risk this cycle. */
  familyCasesOpened: number;
  /** Elevated/high-posture upcoming trips flagged this cycle. */
  travelRisksFlagged: number;
  /** Breach cases auto-opened from leaked credentials this cycle. */
  credentialCasesOpened: number;
  /** Cases auto-opened from high-risk employee/workforce exposure this cycle. */
  employeeCasesOpened: number;
  /** Impersonation/lookalike takedown cases auto-opened this cycle. */
  impersonationCasesOpened: number;
  /** Open cases that breached their response SLA and were auto-escalated. */
  slaBreachesEscalated: number;
  mentionsCollected: number;
  domainRisksFound: number;
  ranAt: string;
}

/** Reputation collection output ready to persist. */
export interface ReputationData {
  mentions: Omit<Mention, "id" | "subjectId">[];
  sentimentByDay: SentimentDay[];
}

/** Domain scan output ready to persist. */
export interface DomainScanData {
  domain: string;
  risks: AssessedRisk[];
}

/** A removal request paired with its owning tenant. */
export interface OwnedRemoval {
  userId: string;
  request: RemovalRequest;
}

export interface SchedulerStore {
  /** Every subject across all tenants, with its current footprint. */
  listFootprints(): Promise<Footprint[]>;
  /** Persist newly discovered exposures + threats for a tenant. */
  saveDiscovered(userId: string, exposures: Exposure[], threats: Threat[]): Promise<void>;
  /** Replace the subject's un-approved recommendations with a fresh set. */
  replaceRecommendations(userId: string, subjectId: string, recs: Recommendation[]): Promise<void>;
  /** Append agent-run audit rows for this cycle. */
  recordRun(userId: string, outcome: ProtectOutcome): Promise<void>;
  /** Append agent-action activity rows. */
  recordActions(userId: string, subjectId: string, actions: NewAgentAction[]): Promise<void>;
  /** Append score snapshots (for trend charts). */
  recordScores(userId: string, subjectId: string, scores: ScoreEntry[]): Promise<void>;
  /** Raise notifications (e.g. for new critical threats). */
  addNotifications(userId: string, notifs: NewNotification[]): Promise<void>;
  /** Removal requests due for processing / a re-check at `now`. */
  listDueRemovals(now: string): Promise<OwnedRemoval[]>;
  /** Existing removals for a subject (to avoid double-filing). */
  listRemovalsForSubject(subjectId: string): Promise<RemovalRequest[]>;
  /** Insert newly auto-filed removal requests. */
  createRemovals(userId: string, subjectId: string, requests: Omit<RemovalRequest, "id">[]): Promise<void>;
  /** Persist an advanced removal request. */
  saveRemoval(userId: string, request: RemovalRequest): Promise<void>;
  /** Replace the subject's mentions + sentiment series from a reputation scan. */
  saveReputation(userId: string, subjectId: string, data: ReputationData): Promise<void>;
  /** Upsert the domain and replace its risks from a DNS/email-security scan. */
  saveDomainRisks(userId: string, data: DomainScanData): Promise<void>;
  /** Append timestamped investigation steps for a newly-discovered threat,
   *  resolved by (subjectId, threatTitle). No-op if the threat row isn't found. */
  recordInvestigation(userId: string, subjectId: string, threatTitle: string, steps: { agent: string; label: string }[]): Promise<void>;
  /** Titles of the subject's currently-open cases (to avoid opening duplicates). */
  listOpenCaseTitlesForSubject(subjectId: string): Promise<string[]>;
  /** Open new cases (e.g. auto-raised from high/critical threats). */
  createCases(userId: string, subjectId: string, cases: NewCaseFields[]): Promise<void>;
  /** Seal autonomous actions as tamper-evident records in the Evidence Vault. */
  recordEvidence(userId: string, subjectId: string, items: EvidenceItem[]): Promise<void>;
  /** Persist legal instruments auto-drafted from cases (left in 'draft' for review). */
  createLegalDrafts(userId: string, subjectId: string, drafts: NewLegalDraft[]): Promise<void>;
  /** Escalate a case that breached its response SLA (idempotent: sets 'escalated'). */
  markCaseEscalated(caseId: string): Promise<void>;
}
