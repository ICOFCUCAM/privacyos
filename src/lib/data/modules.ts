/**
 * Module mock-data service.
 *
 * Provides realistic datasets for the ReputationOS / ExecutiveOS / BusinessOS /
 * legal / reporting modules so every screen is operational today. These are the
 * "mock providers" referenced in the architecture: the schema (0002) and types
 * exist, and these functions are the seam where live Supabase queries will plug
 * in per-module. Deterministic and dependency-free.
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
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  buildDomains,
  mapAgentAction,
  mapCredentialLeak,
  mapDomainRisk,
  mapEmployeeExposure,
  mapFamilyMember,
  mapIncident,
  mapLegalRequest,
  mapMention,
  mapNotification,
  mapSentimentDay,
  mapThirdPartyRisk,
  mapTravelAlert,
} from "./module-mappers";

const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();
const day = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10);

export const mentions: Mention[] = [
  { id: "m1", subjectId: "subj_demo", channel: "news", sourceName: "TechCrunch", url: "https://techcrunch.com/vance-capital", title: "Vance Capital faces investor lawsuit", excerpt: "The firm is named in a complaint filed this week...", sentiment: "negative", sentimentScore: -0.72, searchRank: 2, isDefamatory: false, detectedAt: iso(4) },
  { id: "m2", subjectId: "subj_demo", channel: "forum", sourceName: "Reddit r/finance", title: "Anyone dealt with Jordan Vance?", excerpt: "Heard some shady things...", sentiment: "negative", sentimentScore: -0.55, searchRank: 7, isDefamatory: true, detectedAt: iso(3) },
  { id: "m3", subjectId: "subj_demo", channel: "news", sourceName: "Bloomberg", title: "Vance Capital closes $200M fund", excerpt: "A strong vote of confidence...", sentiment: "positive", sentimentScore: 0.68, searchRank: 4, isDefamatory: false, detectedAt: iso(10) },
  { id: "m4", subjectId: "subj_demo", channel: "review", sourceName: "Glassdoor", title: "Mixed reviews on leadership", excerpt: "Great vision, tough culture...", sentiment: "mixed", sentimentScore: 0.05, isDefamatory: false, detectedAt: iso(14) },
  { id: "m5", subjectId: "subj_demo", channel: "social", sourceName: "X (Twitter)", title: "Thread criticizing recent decision", excerpt: "A viral thread questioning...", sentiment: "negative", sentimentScore: -0.61, searchRank: 9, isDefamatory: false, detectedAt: iso(2) },
  { id: "m6", subjectId: "subj_demo", channel: "blog", sourceName: "Industry blog", title: "Profile: the rise of Vance Capital", excerpt: "A flattering long-read...", sentiment: "positive", sentimentScore: 0.81, searchRank: 6, isDefamatory: false, detectedAt: iso(21) },
];

export const sentimentTrend: SentimentDay[] = Array.from({ length: 14 }, (_, i) => {
  const d = 13 - i;
  const neg = 3 + ((i * 7) % 5);
  const pos = 2 + ((i * 3) % 4);
  const neu = 4 + ((i * 5) % 6);
  const total = neg + pos + neu;
  return { date: day(d), positive: pos, neutral: neu, negative: neg, netScore: Number(((pos - neg) / total).toFixed(3)) };
});

export const incidents: Incident[] = [
  { id: "i1", subjectId: "subj_demo", kind: "deepfake", title: "Synthetic image on Telegram", detail: "AI-generated photo impersonating subject, detector confidence 0.92.", riskLevel: "critical", status: "evidence_gathered", evidenceCount: 4, detectedAt: iso(1), updatedAt: iso(0) },
  { id: "i2", subjectId: "subj_demo", kind: "doxxing", title: "Home address reposted on forum", detail: "Address surfaced in a thread referencing the lawsuit.", riskLevel: "high", status: "investigating", evidenceCount: 2, detectedAt: iso(2), updatedAt: iso(1) },
  { id: "i3", subjectId: "subj_demo", kind: "impersonation", title: "Fake LinkedIn profile", detail: "Profile impersonating the subject contacting business associates.", riskLevel: "high", status: "takedown_requested", evidenceCount: 5, detectedAt: iso(6), updatedAt: iso(2) },
  { id: "i4", subjectId: "subj_demo", kind: "location_exposure", title: "Geotagged family photo", detail: "Public photo with location metadata exposing residence.", riskLevel: "medium", status: "open", evidenceCount: 1, detectedAt: iso(9), updatedAt: iso(9) },
  { id: "i5", subjectId: "subj_demo", kind: "deepfake", title: "Voice clone in scam call", detail: "Reported voice-cloning attempt targeting finance staff.", riskLevel: "critical", status: "resolved", evidenceCount: 3, detectedAt: iso(30), updatedAt: iso(20) },
];

export const travelAlerts: TravelAlert[] = [
  { id: "t1", subjectId: "subj_demo", destination: "London, UK", travelDate: day(-14), riskLevel: "low", advisory: "Low risk. Standard precautions; no active threats near itinerary." },
  { id: "t2", subjectId: "subj_demo", destination: "Mexico City, MX", travelDate: day(-30), riskLevel: "medium", advisory: "Elevated risk. Recent doxxing exposure of address; recommend private transport and varied routes." },
];

export const familyMembers: FamilyMember[] = [
  { id: "f1", displayName: "Alex Vance", relation: "Spouse", isMinor: false, riskLevel: "high", exposuresCount: 4 },
  { id: "f2", displayName: "Mia Vance", relation: "Child (14)", isMinor: true, riskLevel: "critical", exposuresCount: 2 },
  { id: "f3", displayName: "Theo Vance", relation: "Child (11)", isMinor: true, riskLevel: "medium", exposuresCount: 1 },
  { id: "f4", displayName: "Eleanor Vance", relation: "Parent (72)", isMinor: false, riskLevel: "high", exposuresCount: 3 },
];

export const domains: Domain[] = [
  { id: "d1", domain: "vancecapital.com", isPrimary: true, riskCount: 2, highestRisk: "high" },
  { id: "d2", domain: "vance.fund", isPrimary: false, riskCount: 1, highestRisk: "medium" },
];

export const domainRisks: DomainRisk[] = [
  { id: "dr1", domainId: "d1", domain: "vancecapltal.com", kind: "typosquat", detail: "Lookalike domain registered 6 days ago; resolves to a parked page.", riskLevel: "high", resolved: false, detectedAt: iso(6) },
  { id: "dr2", domainId: "d1", domain: "vancecapital.com", kind: "spoof_mx", detail: "SPF/DMARC not enforced — domain spoofable for phishing.", riskLevel: "medium", resolved: false, detectedAt: iso(12) },
  { id: "dr3", domainId: "d2", domain: "vance.fund", kind: "expired_cert", detail: "TLS certificate expires in 9 days.", riskLevel: "medium", resolved: false, detectedAt: iso(1) },
];

export const employeeExposures: EmployeeExposure[] = [
  { id: "ee1", employeeEmail: "m.chen@vancecapital.com", employeeName: "M. Chen", exposureType: "Credential leak", riskLevel: "critical", source: "dark_web", detectedAt: iso(2) },
  { id: "ee2", employeeEmail: "s.patel@vancecapital.com", employeeName: "S. Patel", exposureType: "Credential leak", riskLevel: "high", source: "breach_db", detectedAt: iso(5) },
  { id: "ee3", employeeEmail: "ops@vancecapital.com", exposureType: "Exposed shared inbox", riskLevel: "high", source: "search_engine", detectedAt: iso(8) },
  { id: "ee4", employeeEmail: "j.kim@vancecapital.com", employeeName: "J. Kim", exposureType: "Personal data on broker", riskLevel: "medium", source: "data_broker", detectedAt: iso(11) },
];

export const credentialLeaks: CredentialLeak[] = [
  { id: "cl1", account: "j.vance@gmail.com", breachName: "LinkedIn 2021", dataClasses: ["Email addresses", "Passwords"], pwnCount: 700_000_000, riskLevel: "critical", leakedAt: day(120) },
  { id: "cl2", account: "m.chen@vancecapital.com", breachName: "Collection #1", dataClasses: ["Email addresses", "Passwords"], pwnCount: 770_000_000, riskLevel: "critical", leakedAt: day(400) },
  { id: "cl3", account: "s.patel@vancecapital.com", breachName: "Canva", dataClasses: ["Email addresses", "Names"], pwnCount: 137_000_000, riskLevel: "high", leakedAt: day(900) },
];

export const thirdPartyRisks: ThirdPartyRisk[] = [
  { id: "tpr1", vendorName: "CloudPayroll Inc.", category: "Payroll SaaS", riskScore: 72, riskLevel: "high", findings: "Recent breach disclosure; employee PII may be affected.", assessedAt: iso(7) },
  { id: "tpr2", vendorName: "MailReach", category: "Email vendor", riskScore: 41, riskLevel: "medium", findings: "Weak DMARC posture; subdomain takeover risk.", assessedAt: iso(15) },
  { id: "tpr3", vendorName: "DocStore", category: "Document storage", riskScore: 23, riskLevel: "low", findings: "No issues found in latest assessment.", assessedAt: iso(20) },
];

export const legalRequests: LegalRequest[] = [
  { id: "lr1", subjectId: "subj_demo", type: "broker_optout", recipient: "Spokeo", status: "submitted", body: "", createdAt: iso(3), updatedAt: iso(1) },
  { id: "lr2", subjectId: "subj_demo", type: "gdpr_erasure", recipient: "BeenVerified", status: "completed", body: "", createdAt: iso(40), updatedAt: iso(15) },
  { id: "lr3", subjectId: "subj_demo", type: "defamation_complaint", recipient: "Reddit Legal", status: "draft", body: "", createdAt: iso(1), updatedAt: iso(1) },
  { id: "lr4", subjectId: "subj_demo", type: "platform_abuse", recipient: "Telegram Trust & Safety", status: "escalated", body: "", createdAt: iso(1), updatedAt: iso(0) },
];

export const notifications: Notification[] = [
  { id: "n1", kind: "alert", title: "Critical credential leak detected", body: "j.vance@gmail.com appeared in a fresh dark-web combolist.", riskLevel: "critical", read: false, createdAt: iso(0) },
  { id: "n2", kind: "incident", title: "Deepfake incident escalated", body: "Synthetic image takedown moved to evidence-gathered.", riskLevel: "critical", read: false, createdAt: iso(0) },
  { id: "n3", kind: "removal_update", title: "Spokeo opt-out submitted", body: "Re-checks scheduled at 30/60/90 days.", riskLevel: "high", read: true, createdAt: iso(1) },
  { id: "n4", kind: "report_ready", title: "Weekly executive report ready", body: "Your weekly protection summary is available.", read: true, createdAt: iso(2) },
  { id: "n5", kind: "recommendation", title: "5 new AI recommendations", body: "Prioritized actions are ready for review.", read: true, createdAt: iso(2) },
];

export const agentActions: AgentAction[] = [
  { id: "aa1", agent: "discovery", kind: "scan", summary: "Swept 6 discovery layers; 248 results indexed.", status: "completed", createdAt: iso(0) },
  { id: "aa2", agent: "security", kind: "escalate", summary: "Escalated critical credential leak to breach response.", status: "completed", createdAt: iso(0) },
  { id: "aa3", agent: "privacy", kind: "remove", summary: "Filed opt-out at Spokeo; scheduled re-checks.", status: "completed", createdAt: iso(1) },
  { id: "aa4", agent: "legal", kind: "draft_legal", summary: "Drafted GDPR erasure packet for 3 brokers.", status: "completed", createdAt: iso(1) },
  { id: "aa5", agent: "deepfake", kind: "monitor", summary: "Assembled evidence package for synthetic image.", status: "completed", createdAt: iso(1) },
  { id: "aa6", agent: "reputation", kind: "analyze", summary: "Sentiment sweep across 6 channels; net trend −0.18.", status: "completed", createdAt: iso(2) },
];

export interface ModuleData {
  mentions: Mention[];
  sentimentTrend: SentimentDay[];
  incidents: Incident[];
  travelAlerts: TravelAlert[];
  familyMembers: FamilyMember[];
  domains: Domain[];
  domainRisks: DomainRisk[];
  employeeExposures: EmployeeExposure[];
  credentialLeaks: CredentialLeak[];
  thirdPartyRisks: ThirdPartyRisk[];
  legalRequests: LegalRequest[];
  notifications: Notification[];
  agentActions: AgentAction[];
}

/** The deterministic mock dataset (used when not signed in / unconfigured). */
export function mockModuleData(): ModuleData {
  return {
    mentions,
    sentimentTrend,
    incidents,
    travelAlerts,
    familyMembers,
    domains,
    domainRisks,
    employeeExposures,
    credentialLeaks,
    thirdPartyRisks,
    legalRequests,
    notifications,
    agentActions,
  };
}

/**
 * Returns the full module dataset.
 *
 * Live (Supabase configured + signed in): reads from the suite tables, scoped by
 * RLS to the current user. Otherwise the deterministic mock provider — keeping
 * the product explorable without a backend. Per-table query failures degrade to
 * empty rather than breaking the whole dashboard.
 */
export async function getModuleData(): Promise<ModuleData> {
  if (!isSupabaseConfigured()) return mockModuleData();
  const db = await getSupabaseServerClient();
  if (!db) return mockModuleData();
  let user;
  try {
    const res = await db.auth.getUser();
    user = res.data.user;
  } catch {
    return mockModuleData();
  }
  if (!user) return mockModuleData();

  // RLS scopes every table to the current user, so no explicit user filter.
  const [
    mentionsRes, sentimentRes, incidentsRes, travelRes, familyRes,
    domainRes, domainRiskRes, employeeRes, credentialRes, thirdPartyRes,
    legalRes, notifRes, actionsRes,
  ] = await Promise.all([
    db.from("mentions").select("*").order("detected_at", { ascending: false }),
    db.from("sentiment_records").select("*").order("recorded_on", { ascending: true }),
    db.from("incidents").select("*").order("detected_at", { ascending: false }),
    db.from("travel_alerts").select("*").order("travel_date", { ascending: true }),
    db.from("family_profiles").select("*").order("created_at", { ascending: true }),
    db.from("domains").select("*").order("monitored_since", { ascending: true }),
    db.from("domain_risks").select("*").order("detected_at", { ascending: false }),
    db.from("employee_exposures").select("*").order("detected_at", { ascending: false }),
    db.from("credential_leaks").select("*").order("detected_at", { ascending: false }),
    db.from("third_party_risks").select("*").order("assessed_at", { ascending: false }),
    db.from("legal_requests").select("*").order("updated_at", { ascending: false }),
    db.from("notifications").select("*").order("created_at", { ascending: false }),
    db.from("agent_actions").select("*").order("created_at", { ascending: false }),
  ]);

  const domainRows = domainRes.data ?? [];
  const domainRiskRows = domainRiskRes.data ?? [];
  const domainsById = new Map<string, string>(domainRows.map((d) => [d.id, d.domain]));

  return {
    mentions: (mentionsRes.data ?? []).map(mapMention),
    sentimentTrend: (sentimentRes.data ?? []).map(mapSentimentDay),
    incidents: (incidentsRes.data ?? []).map(mapIncident),
    travelAlerts: (travelRes.data ?? []).map(mapTravelAlert),
    familyMembers: (familyRes.data ?? []).map(mapFamilyMember),
    domains: buildDomains(domainRows, domainRiskRows),
    domainRisks: domainRiskRows.map((r) => mapDomainRisk(r, domainsById)),
    employeeExposures: (employeeRes.data ?? []).map(mapEmployeeExposure),
    credentialLeaks: (credentialRes.data ?? []).map(mapCredentialLeak),
    thirdPartyRisks: (thirdPartyRes.data ?? []).map(mapThirdPartyRisk),
    legalRequests: (legalRes.data ?? []).map(mapLegalRequest),
    notifications: (notifRes.data ?? []).map(mapNotification),
    agentActions: (actionsRes.data ?? []).map(mapAgentAction),
  };
}
