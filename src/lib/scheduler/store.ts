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
  Mention,
  NotificationKind,
  ScoreKind,
  SentimentDay,
} from "@/lib/suite-types";
import type {
  Exposure,
  Recommendation,
  RemovalRequest,
  RiskLevel,
  Subject,
  Threat,
} from "@/lib/types";
import type { ProtectOutcome } from "@/lib/agents/orchestrator";
import type { AssessedRisk } from "@/lib/domains/dns";

export interface Footprint {
  userId: string;
  subject: Subject;
  exposures: Exposure[];
  threats: Threat[];
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

export interface ScheduledRunSummary {
  subjectsProcessed: number;
  newExposures: number;
  newThreats: number;
  recommendations: number;
  removalsAdvanced: number;
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
  /** Persist an advanced removal request. */
  saveRemoval(userId: string, request: RemovalRequest): Promise<void>;
  /** Replace the subject's mentions + sentiment series from a reputation scan. */
  saveReputation(userId: string, subjectId: string, data: ReputationData): Promise<void>;
  /** Upsert the domain and replace its risks from a DNS/email-security scan. */
  saveDomainRisks(userId: string, data: DomainScanData): Promise<void>;
}
