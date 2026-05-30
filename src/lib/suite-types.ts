/**
 * Domain types for the ReputationOS, ExecutiveOS, BusinessOS, legal, reporting,
 * scoring and extended-agent modules. Mirrors supabase/migrations/0002_suites.sql.
 */

import type { AgentKind, RiskLevel, ThreatKind } from "@/lib/types";

/* ── Scoring ─────────────────────────────────────────────────────────────── */
export type ScoreKind = "privacy" | "identity" | "reputation" | "executive" | "business" | "overall";

export interface ScoreSet {
  privacy: number;
  identity: number;
  reputation: number;
  executive: number;
  business: number;
  overall: number;
}

export interface ScorePoint {
  date: string;
  value: number;
}

/* ── ReputationOS ────────────────────────────────────────────────────────── */
export type MentionChannel = "search" | "news" | "blog" | "review" | "forum" | "social";
export type SentimentLabel = "positive" | "neutral" | "negative" | "mixed";

export interface Mention {
  id: string;
  subjectId: string;
  channel: MentionChannel;
  sourceName: string;
  url?: string;
  title: string;
  excerpt: string;
  sentiment: SentimentLabel;
  sentimentScore: number; // -1..1
  searchRank?: number;
  isDefamatory: boolean;
  detectedAt: string;
}

export interface SentimentDay {
  date: string;
  positive: number;
  neutral: number;
  negative: number;
  netScore: number; // -1..1
}

/* ── ExecutiveOS ─────────────────────────────────────────────────────────── */
export type IncidentStatus =
  | "open"
  | "investigating"
  | "evidence_gathered"
  | "takedown_requested"
  | "resolved"
  | "dismissed";

export interface Incident {
  id: string;
  subjectId: string;
  kind: ThreatKind;
  title: string;
  detail: string;
  riskLevel: RiskLevel;
  status: IncidentStatus;
  evidenceCount: number;
  detectedAt: string;
  updatedAt: string;
}

export interface TravelAlert {
  id: string;
  subjectId: string;
  destination: string;
  travelDate?: string;
  riskLevel: RiskLevel;
  advisory: string;
}

export interface FamilyMember {
  id: string;
  displayName: string;
  relation: string;
  isMinor: boolean;
  riskLevel: RiskLevel;
  exposuresCount: number;
}

/* ── BusinessOS ──────────────────────────────────────────────────────────── */
export type DomainRiskKind =
  | "typosquat"
  | "expired_cert"
  | "spoof_mx"
  | "phishing"
  | "dns_takeover"
  | "exposed_subdomain";

export interface Domain {
  id: string;
  domain: string;
  isPrimary: boolean;
  riskCount: number;
  highestRisk: RiskLevel;
}

export interface DomainRisk {
  id: string;
  domainId: string;
  domain: string;
  kind: DomainRiskKind;
  detail: string;
  riskLevel: RiskLevel;
  resolved: boolean;
  detectedAt: string;
}

export interface EmployeeExposure {
  id: string;
  employeeEmail: string;
  employeeName?: string;
  exposureType: string;
  riskLevel: RiskLevel;
  source: string;
  detectedAt: string;
}

export interface CredentialLeak {
  id: string;
  account: string;
  breachName: string;
  dataClasses: string[];
  pwnCount: number;
  riskLevel: RiskLevel;
  leakedAt?: string;
}

export interface ThirdPartyRisk {
  id: string;
  vendorName: string;
  category: string;
  riskScore: number;
  riskLevel: RiskLevel;
  findings: string;
  assessedAt: string;
}

/* ── Legal ───────────────────────────────────────────────────────────────── */
export type LegalRequestType =
  | "gdpr_erasure"
  | "ccpa_delete"
  | "broker_optout"
  | "defamation_complaint"
  | "platform_abuse"
  | "privacy_violation";

export type LegalRequestStatus =
  | "draft"
  | "ready"
  | "submitted"
  | "acknowledged"
  | "completed"
  | "rejected"
  | "escalated";

export interface LegalRequest {
  id: string;
  subjectId: string;
  type: LegalRequestType;
  recipient: string;
  status: LegalRequestStatus;
  body: string;
  createdAt: string;
  updatedAt: string;
}

/* ── Reporting & notifications ───────────────────────────────────────────── */
export type ReportType = "privacy" | "executive" | "business" | "threat" | "compliance" | "risk" | "board";

export interface ReportMeta {
  id: string;
  type: ReportType;
  title: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
}

export type NotificationKind =
  | "alert"
  | "incident"
  | "report_ready"
  | "removal_update"
  | "recommendation"
  | "system";

export interface Notification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  riskLevel?: RiskLevel;
  read: boolean;
  createdAt: string;
}

/* ── Extended agent layer ────────────────────────────────────────────────── */
export type AgentActionKind = "scan" | "analyze" | "remove" | "draft_legal" | "monitor" | "escalate" | "report";

export interface AgentAction {
  id: string;
  agent: AgentKind;
  kind: AgentActionKind;
  summary: string;
  status: string;
  createdAt: string;
}
