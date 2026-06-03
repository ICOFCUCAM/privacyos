/**
 * Suite-data seed mapping.
 *
 * Five suite tables (family, travel, employee exposures, credential leaks,
 * third-party risks) plus the ReputationOS mentions/sentiment have no
 * always-on producer, so a fresh live account shows empty registers. This pure
 * module maps the illustrative sample dataset into insert rows scoped to a
 * (userId, subjectId), so a seed action can persist them through Supabase + RLS.
 * IO-free and unit-tested; the rows are clearly sample data.
 */

import type {
  CredentialLeak, EmployeeExposure, FamilyMember, Mention, SentimentDay, ThirdPartyRisk, TravelAlert,
} from "@/lib/suite-types";
import {
  credentialLeaks, employeeExposures, familyMembers, mentions, sentimentTrend, thirdPartyRisks, travelAlerts,
} from "./modules";

/** Tables this seeder can populate (those without an always-on producer). */
export type SeedTable =
  | "family_profiles" | "travel_alerts" | "employee_exposures"
  | "credential_leaks" | "third_party_risks" | "mentions" | "sentiment_records";

export const SEED_TABLES: SeedTable[] = [
  "family_profiles", "travel_alerts", "employee_exposures",
  "credential_leaks", "third_party_risks", "mentions", "sentiment_records",
];

export interface SuiteSeedRows {
  family_profiles: Record<string, unknown>[];
  travel_alerts: Record<string, unknown>[];
  employee_exposures: Record<string, unknown>[];
  credential_leaks: Record<string, unknown>[];
  third_party_risks: Record<string, unknown>[];
  mentions: Record<string, unknown>[];
  sentiment_records: Record<string, unknown>[];
}

export interface SeedSource {
  family: FamilyMember[];
  travel: TravelAlert[];
  employees: EmployeeExposure[];
  credentials: CredentialLeak[];
  vendors: ThirdPartyRisk[];
  mentions: Mention[];
  sentiment: SentimentDay[];
}

/** The default sample dataset (mirrors demo mode). */
export const SAMPLE_SOURCE: SeedSource = {
  family: familyMembers,
  travel: travelAlerts,
  employees: employeeExposures,
  credentials: credentialLeaks,
  vendors: thirdPartyRisks,
  mentions,
  sentiment: sentimentTrend,
};

/**
 * Build insert rows for every seed table, scoped to the user + subject. Ids are
 * omitted so the database mints fresh ones; org-scoped tables get user_id only.
 */
export function buildSuiteSeedRows(userId: string, subjectId: string, src: SeedSource = SAMPLE_SOURCE): SuiteSeedRows {
  return {
    family_profiles: src.family.map((m) => ({
      user_id: userId, subject_id: subjectId,
      display_name: m.displayName, relation: m.relation, is_minor: m.isMinor,
      risk_level: m.riskLevel, exposures_count: m.exposuresCount,
    })),
    travel_alerts: src.travel.map((t) => ({
      user_id: userId, subject_id: subjectId,
      destination: t.destination, travel_date: t.travelDate ?? null,
      risk_level: t.riskLevel, advisory: t.advisory,
    })),
    employee_exposures: src.employees.map((e) => ({
      user_id: userId,
      employee_email: e.employeeEmail, employee_name: e.employeeName ?? null,
      exposure_type: e.exposureType, risk_level: e.riskLevel, source: e.source,
      detected_at: e.detectedAt,
    })),
    credential_leaks: src.credentials.map((c) => ({
      user_id: userId, subject_id: subjectId,
      account: c.account, breach_name: c.breachName, data_classes: c.dataClasses,
      pwn_count: c.pwnCount, risk_level: c.riskLevel, leaked_at: c.leakedAt ?? null,
    })),
    third_party_risks: src.vendors.map((v) => ({
      user_id: userId,
      vendor_name: v.vendorName, category: v.category, risk_score: v.riskScore,
      risk_level: v.riskLevel, findings: v.findings, assessed_at: v.assessedAt,
    })),
    mentions: src.mentions.map((m) => ({
      user_id: userId, subject_id: subjectId,
      channel: m.channel, source_name: m.sourceName, url: m.url ?? null,
      title: m.title, excerpt: m.excerpt, sentiment: m.sentiment,
      sentiment_score: m.sentimentScore, search_rank: m.searchRank ?? null,
      is_defamatory: m.isDefamatory, detected_at: m.detectedAt,
    })),
    sentiment_records: src.sentiment.map((d) => ({
      user_id: userId, subject_id: subjectId,
      recorded_on: d.date, positive: d.positive, neutral: d.neutral,
      negative: d.negative, net_score: d.netScore,
    })),
  };
}
