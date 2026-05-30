/**
 * Row → domain mappers for the suite module tables (0002_suites.sql).
 * Pure functions, mirroring the patterns in `mappers.ts`.
 */

import type {
  AgentAction,
  CredentialLeak,
  Domain,
  DomainRisk,
  EmployeeExposure,
  FamilyMember,
  Incident,
  LegalRequest,
  Mention,
  Notification,
  SentimentDay,
  ThirdPartyRisk,
  TravelAlert,
} from "@/lib/suite-types";
import type { RiskLevel } from "@/lib/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

const RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };

export function mapMention(r: any): Mention {
  return {
    id: r.id,
    subjectId: r.subject_id,
    channel: r.channel,
    sourceName: r.source_name,
    url: r.url ?? undefined,
    title: r.title,
    excerpt: r.excerpt ?? "",
    sentiment: r.sentiment,
    sentimentScore: Number(r.sentiment_score ?? 0),
    searchRank: r.search_rank ?? undefined,
    isDefamatory: r.is_defamatory ?? false,
    detectedAt: r.detected_at,
  };
}

export function mapSentimentDay(r: any): SentimentDay {
  return {
    date: r.recorded_on,
    positive: r.positive ?? 0,
    neutral: r.neutral ?? 0,
    negative: r.negative ?? 0,
    netScore: Number(r.net_score ?? 0),
  };
}

export function mapIncident(r: any): Incident {
  return {
    id: r.id,
    subjectId: r.subject_id,
    kind: r.kind,
    title: r.title,
    detail: r.detail ?? "",
    riskLevel: r.risk_level,
    status: r.status,
    evidenceCount: Array.isArray(r.evidence) ? r.evidence.length : 0,
    detectedAt: r.detected_at,
    updatedAt: r.updated_at,
  };
}

export function mapTravelAlert(r: any): TravelAlert {
  return {
    id: r.id,
    subjectId: r.subject_id,
    destination: r.destination,
    travelDate: r.travel_date ?? undefined,
    riskLevel: r.risk_level,
    advisory: r.advisory ?? "",
  };
}

export function mapFamilyMember(r: any): FamilyMember {
  return {
    id: r.id,
    displayName: r.display_name,
    relation: r.relation,
    isMinor: r.is_minor ?? false,
    riskLevel: r.risk_level,
    exposuresCount: r.exposures_count ?? 0,
  };
}

export function mapCredentialLeak(r: any): CredentialLeak {
  return {
    id: r.id,
    account: r.account,
    breachName: r.breach_name,
    dataClasses: r.data_classes ?? [],
    pwnCount: Number(r.pwn_count ?? 0),
    riskLevel: r.risk_level,
    leakedAt: r.leaked_at ?? undefined,
  };
}

export function mapEmployeeExposure(r: any): EmployeeExposure {
  return {
    id: r.id,
    employeeEmail: r.employee_email,
    employeeName: r.employee_name ?? undefined,
    exposureType: r.exposure_type,
    riskLevel: r.risk_level,
    source: r.source,
    detectedAt: r.detected_at,
  };
}

export function mapThirdPartyRisk(r: any): ThirdPartyRisk {
  return {
    id: r.id,
    vendorName: r.vendor_name,
    category: r.category ?? "vendor",
    riskScore: r.risk_score ?? 0,
    riskLevel: r.risk_level,
    findings: r.findings ?? "",
    assessedAt: r.assessed_at,
  };
}

export function mapLegalRequest(r: any): LegalRequest {
  return {
    id: r.id,
    subjectId: r.subject_id,
    type: r.type,
    recipient: r.recipient,
    status: r.status,
    body: r.body ?? "",
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function mapNotification(r: any): Notification {
  return {
    id: r.id,
    kind: r.kind,
    title: r.title,
    body: r.body ?? "",
    riskLevel: r.risk_level ?? undefined,
    read: r.read ?? false,
    createdAt: r.created_at,
  };
}

export function mapAgentAction(r: any): AgentAction {
  return {
    id: r.id,
    agent: r.agent,
    kind: r.kind,
    summary: r.summary,
    status: r.status ?? "completed",
    createdAt: r.created_at,
  };
}

/**
 * Build Domain summaries from domain rows + their risk rows: each domain gets a
 * risk count and its highest severity. Pure so it can be unit-tested.
 */
export function buildDomains(domainRows: any[], riskRows: any[]): Domain[] {
  return domainRows.map((d) => {
    const risks = riskRows.filter((r) => r.domain_id === d.id && !r.resolved);
    const highest = risks.reduce<RiskLevel>(
      (acc, r) => (RANK[r.risk_level as RiskLevel] > RANK[acc] ? r.risk_level : acc),
      "low",
    );
    return {
      id: d.id,
      domain: d.domain,
      isPrimary: d.is_primary ?? false,
      riskCount: risks.length,
      highestRisk: highest,
    };
  });
}

export function mapDomainRisk(r: any, domainsById: Map<string, string>): DomainRisk {
  return {
    id: r.id,
    domainId: r.domain_id,
    domain: domainsById.get(r.domain_id) ?? "",
    kind: r.kind,
    detail: r.detail ?? "",
    riskLevel: r.risk_level,
    resolved: r.resolved ?? false,
    detectedAt: r.detected_at,
  };
}
