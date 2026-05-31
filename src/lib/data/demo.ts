/**
 * Deterministic demo dataset.
 *
 * Powers the dashboard and API when no Supabase project is configured, so the
 * product is fully explorable out of the box. The same shapes are produced by
 * the database layer in production.
 */

import type {
  AgentState,
  Case,
  Exposure,
  Recommendation,
  Subject,
  Threat,
} from "@/lib/types";
import { computeRiskScore } from "@/lib/scoring/risk-score";

const iso = (daysAgo: number) =>
  new Date(Date.now() - daysAgo * 86_400_000).toISOString();

export const demoSubject: Subject = {
  id: "subj_demo",
  type: "executive",
  displayName: "Jordan Vance",
  emails: ["jordan@vancecapital.com", "j.vance@gmail.com"],
  phones: ["+1 (415) 555-0142"],
  usernames: ["jvance", "jordanvance"],
  organization: "Vance Capital",
  createdAt: iso(120),
};

export const demoExposures: Exposure[] = [
  {
    id: "exp_1", subjectId: demoSubject.id, category: "address", source: "data_broker",
    sourceName: "Spokeo", url: "https://spokeo.com/jordan-vance",
    snippet: "Jordan Vance, 41 — 88 Marina Blvd, San Francisco, CA",
    riskLevel: "high", riskScore: 38, status: "removal_requested", discoveredAt: iso(40), lastSeenAt: iso(3),
  },
  {
    id: "exp_2", subjectId: demoSubject.id, category: "credential", source: "dark_web",
    sourceName: "BreachForums dump", snippet: "j.vance@gmail.com : ********  (LinkedIn 2021 breach)",
    riskLevel: "critical", riskScore: 60, status: "discovered", discoveredAt: iso(2), lastSeenAt: iso(1),
  },
  {
    id: "exp_3", subjectId: demoSubject.id, category: "phone", source: "data_broker",
    sourceName: "WhitePages", snippet: "Jordan Vance — mobile (415) 555-0142",
    riskLevel: "medium", riskScore: 20, status: "in_progress", discoveredAt: iso(35), lastSeenAt: iso(5),
  },
  {
    id: "exp_4", subjectId: demoSubject.id, category: "family", source: "social_media",
    sourceName: "Facebook", snippet: "Tagged photo with spouse and two children, location enabled",
    riskLevel: "high", riskScore: 36, status: "triaged", discoveredAt: iso(18), lastSeenAt: iso(2),
  },
  {
    id: "exp_5", subjectId: demoSubject.id, category: "employer", source: "news",
    sourceName: "TechCrunch", url: "https://techcrunch.com/vance-capital",
    snippet: "Vance Capital faces investor lawsuit over...",
    riskLevel: "high", riskScore: 34, status: "monitoring", discoveredAt: iso(60), lastSeenAt: iso(7),
  },
  {
    id: "exp_6", subjectId: demoSubject.id, category: "photo", source: "ai_generated",
    sourceName: "Telegram channel", snippet: "Synthetic image of subject — detector confidence 0.92",
    riskLevel: "critical", riskScore: 55, status: "discovered", discoveredAt: iso(1), lastSeenAt: iso(0),
  },
  {
    id: "exp_7", subjectId: demoSubject.id, category: "name", source: "public_record",
    sourceName: "County records", snippet: "Property deed — public filing",
    riskLevel: "medium", riskScore: 18, status: "monitoring", discoveredAt: iso(90), lastSeenAt: iso(10),
  },
  {
    id: "exp_8", subjectId: demoSubject.id, category: "email", source: "data_broker",
    sourceName: "BeenVerified", snippet: "jordan@vancecapital.com associated with 3 profiles",
    riskLevel: "medium", riskScore: 22, status: "removed", discoveredAt: iso(50), lastSeenAt: iso(20),
  },
];

export const demoThreats: Threat[] = [
  {
    id: "thr_1", subjectId: demoSubject.id, kind: "credential_leak",
    title: "Credential pair leaked on dark web", detail: "j.vance@gmail.com exposed in a fresh combolist.",
    riskLevel: "critical", source: "dark_web", detectedAt: iso(1), acknowledged: false,
  },
  {
    id: "thr_2", subjectId: demoSubject.id, kind: "deepfake",
    title: "Synthetic image detected", detail: "AI-generated photo impersonating subject on a Telegram channel.",
    riskLevel: "critical", source: "ai_generated", detectedAt: iso(0), acknowledged: false,
  },
  {
    id: "thr_3", subjectId: demoSubject.id, kind: "doxxing",
    title: "Home address reposted", detail: "Address surfaced on a forum thread referencing the lawsuit.",
    riskLevel: "high", source: "forum", detectedAt: iso(2), acknowledged: false,
  },
  {
    id: "thr_4", subjectId: demoSubject.id, kind: "negative_press",
    title: "Negative article gaining search visibility", detail: "TechCrunch piece now ranks #2 for the subject's name.",
    riskLevel: "high", source: "news", detectedAt: iso(4), acknowledged: true,
  },
];

export const demoCases: Case[] = [
  {
    id: "case_1", subjectId: demoSubject.id, type: "breach_response",
    title: "Dark-web credential leak response", summary: "Rotate credentials, enforce MFA, monitor reuse.",
    status: "in_progress", riskLevel: "critical", assignedAgent: "security",
    relatedExposureIds: ["exp_2"], createdAt: iso(1), updatedAt: iso(0),
  },
  {
    id: "case_2", subjectId: demoSubject.id, type: "data_broker_removal",
    title: "Spokeo address removal", summary: "Opt-out filed; 30/60/90-day re-checks scheduled.",
    status: "awaiting_response", riskLevel: "high", assignedAgent: "privacy",
    relatedExposureIds: ["exp_1"], createdAt: iso(3), updatedAt: iso(1),
  },
  {
    id: "case_3", subjectId: demoSubject.id, type: "deepfake_incident",
    title: "Synthetic image takedown", summary: "Evidence package assembled for platform takedown.",
    status: "open", riskLevel: "critical", assignedAgent: "deepfake",
    relatedExposureIds: ["exp_6"], createdAt: iso(0), updatedAt: iso(0),
  },
  {
    id: "case_4", subjectId: demoSubject.id, type: "reputation_recovery",
    title: "Search suppression — lawsuit article", summary: "Positive-content + SEO plan to displace negative result.",
    status: "open", riskLevel: "high", assignedAgent: "reputation",
    relatedExposureIds: ["exp_5"], createdAt: iso(4), updatedAt: iso(2),
  },
];

export const demoAgents: AgentState[] = [
  { kind: "discovery", name: "Discovery Agent", description: "Scans the public internet, brokers and breach feeds.", status: "running", lastRunAt: iso(0), itemsHandled: 248 },
  { kind: "privacy", name: "Privacy Agent", description: "Files opt-outs and tracks removals.", status: "running", lastRunAt: iso(0), itemsHandled: 36 },
  { kind: "legal", name: "Legal Agent", description: "Drafts GDPR/CCPA requests and complaints.", status: "idle", lastRunAt: iso(0), itemsHandled: 12 },
  { kind: "reputation", name: "Reputation Agent", description: "Monitors sentiment and search visibility.", status: "running", lastRunAt: iso(0), itemsHandled: 54 },
  { kind: "security", name: "Security Agent", description: "Watches breach and dark-web sources.", status: "running", lastRunAt: iso(0), itemsHandled: 19 },
  { kind: "deepfake", name: "Deepfake Agent", description: "Detects synthetic media and voice clones.", status: "blocked", lastRunAt: iso(0), itemsHandled: 3 },
  { kind: "executive", name: "Executive Protection Agent", description: "VIP-grade physical & digital protection.", status: "running", lastRunAt: iso(0), itemsHandled: 7 },
  { kind: "business", name: "Business Intelligence Agent", description: "Org credential, asset and brand protection.", status: "idle", lastRunAt: iso(0), itemsHandled: 0 },
  { kind: "orchestrator", name: "Orchestrator Agent", description: "Triages, prioritizes and routes work across the fleet.", status: "running", lastRunAt: iso(0), itemsHandled: 142 },
  { kind: "incident", name: "Incident Response Agent", description: "Runs response playbooks; automates safe steps, escalates the rest.", status: "running", lastRunAt: iso(0), itemsHandled: 28 },
  { kind: "compliance", name: "Compliance Agent", description: "Monitors SOC 2 control posture and SLA attainment.", status: "idle", lastRunAt: iso(0), itemsHandled: 15 },
  { kind: "threat_intel", name: "Threat Intelligence Agent", description: "Correlates signals into emerging-threat narratives.", status: "running", lastRunAt: iso(0), itemsHandled: 61 },
  { kind: "vendor", name: "Vendor Risk Agent", description: "Assesses third-party and supply-chain risk.", status: "idle", lastRunAt: iso(0), itemsHandled: 9 },
];

export const demoRecommendations: Recommendation[] = [
  { id: "rec_1", subjectId: demoSubject.id, agent: "security", title: "Rotate exposed credentials now", rationale: "A critical credential pair is live on the dark web — rotate and enforce MFA to stop account takeover.", riskLevel: "critical", impact: 18, actionLabel: "Start breach response" },
  { id: "rec_2", subjectId: demoSubject.id, agent: "executive", title: "Escalate physical-security exposure", rationale: "Home address + family photos are exposed for a VIP subject. Priority removal and a protection briefing are advised.", riskLevel: "critical", impact: 22, actionLabel: "Escalate" },
  { id: "rec_3", subjectId: demoSubject.id, agent: "deepfake", title: "Open deepfake incident & takedown", rationale: "Synthetic image detected with 0.92 confidence. Evidence package ready for platform takedown.", riskLevel: "critical", impact: 14, actionLabel: "Open incident" },
  { id: "rec_4", subjectId: demoSubject.id, agent: "reputation", title: "Launch reputation recovery plan", rationale: "A negative article now ranks #2 for the subject's name. SEO + content plan can displace it.", riskLevel: "high", impact: 12, actionLabel: "Build plan" },
  { id: "rec_5", subjectId: demoSubject.id, agent: "privacy", title: "File 4 additional broker opt-outs", rationale: "Four medium/high broker profiles remain. Automated opt-outs with recurring re-checks will remove them.", riskLevel: "high", impact: 9, actionLabel: "Generate opt-outs" },
];

export const demoRiskScore = computeRiskScore(demoExposures, demoThreats, [
  { date: iso(150), overall: 71 },
  { date: iso(120), overall: 74 },
  { date: iso(90), overall: 68 },
  { date: iso(60), overall: 63 },
  { date: iso(30), overall: 58 },
  { date: iso(7), overall: 61 },
  { date: iso(0), overall: 0 }, // filled below
]);
// Make the last trend point reflect the computed live score.
demoRiskScore.trend[demoRiskScore.trend.length - 1].overall = demoRiskScore.overall;

export const demoRemovals: import("@/lib/types").RemovalRequest[] = [
  {
    id: "rem_1", subjectId: demoSubject.id, exposureId: "exp_1", brokerName: "Spokeo",
    status: "monitoring", submittedAt: iso(40), nextCheckAt: iso(-20),
    history: [
      { at: iso(40), status: "removal_requested", note: "Opt-out filed with Spokeo." },
      { at: iso(38), status: "in_progress", note: "Broker acknowledged the request; processing removal." },
      { at: iso(33), status: "removed", note: "Listing removed. First reappearance re-check in 30 days." },
      { at: iso(3), status: "monitoring", note: "Re-check passed — still removed. Next re-check in 60 days." },
    ],
  },
  {
    id: "rem_2", subjectId: demoSubject.id, exposureId: "exp_3", brokerName: "WhitePages",
    status: "in_progress", submittedAt: iso(5),
    history: [
      { at: iso(5), status: "removal_requested", note: "Opt-out filed with WhitePages." },
      { at: iso(2), status: "in_progress", note: "Broker acknowledged the request; processing removal." },
    ],
  },
  {
    id: "rem_3", subjectId: demoSubject.id, brokerName: "MyLife",
    status: "reappeared", submittedAt: iso(70), nextCheckAt: iso(0),
    history: [
      { at: iso(70), status: "removal_requested", note: "Opt-out filed with MyLife." },
      { at: iso(66), status: "in_progress", note: "Broker acknowledged the request." },
      { at: iso(60), status: "removed", note: "Listing removed." },
      { at: iso(2), status: "reappeared", note: "Listing reappeared — re-filing opt-out." },
    ],
  },
  {
    id: "rem_4", subjectId: demoSubject.id, exposureId: "exp_8", brokerName: "BeenVerified",
    status: "removed", submittedAt: iso(50), nextCheckAt: iso(10),
    history: [
      { at: iso(50), status: "removal_requested", note: "Opt-out filed with BeenVerified." },
      { at: iso(47), status: "in_progress", note: "Broker acknowledged the request." },
      { at: iso(44), status: "removed", note: "Listing removed. First reappearance re-check in 30 days." },
    ],
  },
];
