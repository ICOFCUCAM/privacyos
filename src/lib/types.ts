/**
 * PrivacyOS core domain model.
 *
 * These types are the contract shared between the database layer, the AI agent
 * orchestration layer, the API routes, and the dashboard UI. They intentionally
 * mirror the Supabase schema in `supabase/migrations`.
 */

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type SubjectType = "individual" | "executive" | "family_member" | "business";

/** A protected subject — the person, family member, or organization we defend. */
export interface Subject {
  id: string;
  type: SubjectType;
  displayName: string;
  /** Identifiers we monitor for this subject. */
  emails: string[];
  phones: string[];
  usernames: string[];
  organization?: string;
  createdAt: string;
}

export type ExposureCategory =
  | "name"
  | "alias"
  | "email"
  | "phone"
  | "address"
  | "family"
  | "photo"
  | "username"
  | "employer"
  | "financial"
  | "credential";

export type ExposureSource =
  | "data_broker"
  | "search_engine"
  | "social_media"
  | "forum"
  | "breach_db"
  | "dark_web"
  | "news"
  | "public_record"
  | "archive"
  | "ai_generated";

export type ExposureStatus =
  | "discovered"
  | "triaged"
  | "removal_requested"
  | "in_progress"
  | "removed"
  | "monitoring"
  | "reappeared";

/** A single discoverable piece of a subject's digital footprint. */
export interface Exposure {
  id: string;
  subjectId: string;
  category: ExposureCategory;
  source: ExposureSource;
  sourceName: string;
  url?: string;
  snippet: string;
  riskLevel: RiskLevel;
  /** 0–100 contribution toward the subject's exposure score. */
  riskScore: number;
  status: ExposureStatus;
  discoveredAt: string;
  lastSeenAt: string;
}

/** Multi-dimensional risk breakdown shown on the dashboard. */
export interface RiskScore {
  overall: number; // 0–100, higher = more exposed
  identity: number;
  reputation: number;
  financial: number;
  security: number;
  family: number;
  trend: { date: string; overall: number }[];
}

export type CaseType =
  | "data_broker_removal"
  | "reputation_recovery"
  | "deepfake_incident"
  | "impersonation_takedown"
  | "breach_response"
  | "executive_protection"
  | "legal_request";

export type CaseStatus = "open" | "in_progress" | "awaiting_response" | "escalated" | "resolved";

/** A unit of remediation work, often driven autonomously by an agent. */
export interface Case {
  id: string;
  subjectId: string;
  type: CaseType;
  title: string;
  summary: string;
  status: CaseStatus;
  riskLevel: RiskLevel;
  assignedAgent: AgentKind;
  relatedExposureIds: string[];
  createdAt: string;
  updatedAt: string;
}

export type ThreatKind =
  | "credential_leak"
  | "dark_web_mention"
  | "deepfake"
  | "impersonation"
  | "doxxing"
  | "location_exposure"
  | "negative_press";

/** A time-ordered alert surfaced in the threat feed. */
export interface Threat {
  id: string;
  subjectId: string;
  kind: ThreatKind;
  title: string;
  detail: string;
  riskLevel: RiskLevel;
  source: ExposureSource;
  detectedAt: string;
  acknowledged: boolean;
}

export type AgentKind =
  | "discovery"
  | "privacy"
  | "legal"
  | "reputation"
  | "security"
  | "deepfake"
  | "executive"
  | "business"
  // ── Coordination & response roles (added beyond the original 8 specialists) ──
  | "orchestrator"
  | "incident"
  | "compliance"
  | "threat_intel"
  | "vendor";

export type AgentStatus = "idle" | "running" | "blocked" | "error";

/** Live state of a specialized agent in the orchestration layer. */
export interface AgentState {
  kind: AgentKind;
  name: string;
  description: string;
  status: AgentStatus;
  lastRunAt?: string;
  itemsHandled: number;
}

/** A recommended action produced by an agent for the user to approve. */
export interface Recommendation {
  id: string;
  subjectId: string;
  agent: AgentKind;
  title: string;
  rationale: string;
  riskLevel: RiskLevel;
  /** Estimated risk-score reduction if actioned. */
  impact: number;
  actionLabel: string;
}

/** A single event in a removal request's lifecycle (stored as jsonb). */
export interface RemovalEvent {
  at: string;
  status: ExposureStatus;
  note: string;
}

/** A data-broker opt-out request and its tracked lifecycle. */
export interface RemovalRequest {
  id: string;
  subjectId: string;
  exposureId?: string;
  brokerName: string;
  status: ExposureStatus;
  submittedAt: string;
  nextCheckAt?: string;
  history: RemovalEvent[];
}
