/**
 * Data-source abstraction.
 *
 * Dashboard pages and API routes depend on this interface, never on Supabase or
 * the demo arrays directly. A resolver (see `index.ts`) picks the live Supabase
 * source when the user is authenticated, and otherwise the deterministic demo
 * source — so the product is always explorable.
 */

import type {
  AgentState,
  Case,
  Exposure,
  Recommendation,
  RemovalRequest,
  RiskScore,
  Subject,
  Threat,
} from "@/lib/types";
import type { ProtectOutcome } from "@/lib/agents/orchestrator";
import type { DiscoveryFinding } from "@/lib/discovery/source";
import type { EvidenceItem } from "@/lib/intelligence/evidence-vault";

/** Everything the dashboard needs for one subject, in one bundle. */
export interface PrivacyDataSet {
  subject: Subject;
  exposures: Exposure[];
  threats: Threat[];
  cases: Case[];
  recommendations: Recommendation[];
  agents: AgentState[];
  riskScore: RiskScore;
}

export interface DataSource {
  /** True when backed by a live, authenticated Supabase session. */
  readonly live: boolean;

  /** The user's primary protected subject, or null if none exists yet. */
  getPrimarySubject(): Promise<Subject | null>;

  /** Full dataset for a subject (defaults to the primary subject). */
  getDataset(subjectId?: string): Promise<PrivacyDataSet>;

  /** Mark a threat as acknowledged. */
  acknowledgeThreat(id: string): Promise<void>;

  /** Persist the primary subject's autonomy mode so the background cycle honors it. */
  setAutonomyMode(mode: "autopilot" | "hybrid" | "advisor"): Promise<void>;

  /** Approve an agent recommendation. */
  approveRecommendation(id: string): Promise<void>;

  /** Persist the results of an orchestrator run (audit log + new recommendations). */
  persistProtectRun(outcome: ProtectOutcome): Promise<void>;

  /** Persist newly discovered exposures + threats from the discovery pipeline. */
  persistDiscovery(finding: DiscoveryFinding): Promise<void>;

  /** Data-broker removal requests for the primary subject. */
  listRemovals(): Promise<RemovalRequest[]>;
  /** File a new opt-out request with a broker. */
  createRemoval(brokerName: string, exposureId?: string): Promise<void>;
  /** Advance a removal request by one workflow tick (process / re-check). */
  recheckRemoval(id: string): Promise<void>;

  /** Sealed evidence the engine has persisted for the primary subject (the live
   *  ledger of autonomous actions). Empty in demo mode, where the page derives
   *  evidence from the dataset instead. */
  listEvidence(): Promise<EvidenceItem[]>;
}
