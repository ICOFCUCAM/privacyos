/**
 * The Scary Mirror — the 5-minute activation moment.
 *
 * The highest-value moment in the product: a new customer enters almost
 * nothing, and within minutes sees *everything* exposed about them — brokers
 * selling their data, accounts in breaches, dark-web mentions, search results,
 * impersonations — immediately followed by "…and we're already fixing it."
 *
 * This engine turns the real discovery/exposure/threat data into that reveal:
 * it groups findings into human categories, scores the exposure, and produces
 * the auto-remediation plan (which protection packs we'll install). Pure and
 * unit-tested; the surface animates the scan, the engine produces the truth.
 */

import type { Exposure, Threat, RiskLevel, ExposureSource, ThreatKind } from "@/lib/types";

const RISK_RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };
const RANK_RISK: RiskLevel[] = ["low", "medium", "high", "critical"];
const SEVERITY_WEIGHT: Record<RiskLevel, number> = { low: 2, medium: 5, high: 9, critical: 14 };

export type MirrorCategory = "brokers" | "breaches" | "darkweb" | "reputation" | "identity" | "social";

export interface MirrorFinding {
  category: MirrorCategory;
  label: string;
  count: number;
  severity: RiskLevel;
  /** The scary specifics — broker/breach/source names. */
  samples: string[];
  /** What we'll do about it, plain language. */
  fixLabel: string;
  /** The protection pack we auto-install to handle it (marketplace listing id). */
  pack?: string;
}

export interface FixStep {
  label: string;
  detail: string;
  pack?: string;
}

export interface ScaryMirrorReport {
  name: string;
  sourcesScanned: number;
  totalFindings: number;
  categoriesAffected: number;
  /** 0–100, higher = more exposed (the scary number). */
  exposureScore: number;
  /** 0–100 starting protection score (the room to improve). */
  protectionScore: number;
  headline: string;
  worst: MirrorFinding | null;
  findings: MirrorFinding[];
  fixPlan: FixStep[];
  /** Lines the surface reveals while "scanning". */
  scanLog: string[];
}

interface CategoryMeta {
  label: string;
  fixLabel: string;
  pack?: string;
  order: number;
}

const CATEGORY_META: Record<MirrorCategory, CategoryMeta> = {
  brokers: { label: "Data brokers selling your info", fixLabel: "File opt-out & removal requests", pack: "remove-data-brokers", order: 0 },
  breaches: { label: "Accounts caught in breaches", fixLabel: "Secure & rotate exposed accounts", pack: "breach-response", order: 1 },
  darkweb: { label: "Dark-web exposure", fixLabel: "Monitor the dark web & alert you", pack: "dark-web-watch", order: 2 },
  identity: { label: "Exposed personal identifiers", fixLabel: "Suppress personal data & pursue takedowns", pack: "remove-data-brokers", order: 3 },
  reputation: { label: "Search & news results", fixLabel: "Suppress negatives, promote the truth", pack: "reputation-recovery", order: 4 },
  social: { label: "Impersonation & fake media", fixLabel: "Take down impersonations & fake media", pack: "protect-my-ceo", order: 5 },
};

const SOURCE_CATEGORY: Record<ExposureSource, MirrorCategory> = {
  data_broker: "brokers",
  public_record: "brokers",
  breach_db: "breaches",
  dark_web: "darkweb",
  forum: "darkweb",
  search_engine: "reputation",
  news: "reputation",
  archive: "reputation",
  social_media: "social",
  ai_generated: "social",
};

const THREATKIND_CATEGORY: Record<ThreatKind, MirrorCategory> = {
  credential_leak: "breaches",
  dark_web_mention: "darkweb",
  deepfake: "social",
  impersonation: "social",
  doxxing: "identity",
  location_exposure: "identity",
  negative_press: "reputation",
};

interface Bucket { items: { name: string; risk: RiskLevel }[]; }

export interface ScaryMirrorInput {
  name: string;
  exposures: Exposure[];
  threats: Threat[];
  /** How many sources we say we scanned (cosmetic but deterministic). */
  sourcesScanned?: number;
}

export function buildScaryMirror(input: ScaryMirrorInput): ScaryMirrorReport {
  const buckets = new Map<MirrorCategory, Bucket>();
  const push = (cat: MirrorCategory, name: string, risk: RiskLevel) => {
    const b = buckets.get(cat) ?? { items: [] };
    b.items.push({ name, risk });
    buckets.set(cat, b);
  };

  for (const e of input.exposures) push(SOURCE_CATEGORY[e.source], e.sourceName, e.riskLevel);
  for (const t of input.threats) {
    if (t.acknowledged) continue;
    push(THREATKIND_CATEGORY[t.kind], t.title, t.riskLevel);
  }

  const findings: MirrorFinding[] = [];
  let weight = 0;
  for (const [cat, b] of buckets) {
    if (b.items.length === 0) continue;
    const severity = b.items.reduce<RiskLevel>((mx, it) => (RISK_RANK[it.risk] > RISK_RANK[mx] ? it.risk : mx), "low");
    const samples = [...new Set(b.items.map((it) => it.name))].slice(0, 3);
    const meta = CATEGORY_META[cat];
    findings.push({ category: cat, label: meta.label, count: b.items.length, severity, samples, fixLabel: meta.fixLabel, pack: meta.pack });
    for (const it of b.items) weight += SEVERITY_WEIGHT[it.risk];
  }

  findings.sort((a, b) => RISK_RANK[b.severity] - RISK_RANK[a.severity] || b.count - a.count || CATEGORY_META[a.category].order - CATEGORY_META[b.category].order);

  const totalFindings = findings.reduce((s, f) => s + f.count, 0);
  const exposureScore = totalFindings === 0 ? 0 : Math.max(8, Math.min(96, weight));
  const protectionScore = 100 - exposureScore;
  const sourcesScanned = input.sourcesScanned ?? 64;
  const worst = findings[0] ?? null;

  const headline = totalFindings === 0
    ? `Good news, ${input.name} — we scanned ${sourcesScanned}+ sources and found nothing exposed.`
    : `We scanned ${sourcesScanned}+ sources and found ${totalFindings} way${totalFindings === 1 ? "" : "s"} you're exposed.`;

  // Auto-remediation plan: one step per affected category, ordered by severity.
  const fixPlan: FixStep[] = findings.map((f) => ({
    label: f.fixLabel,
    detail: `${f.count} ${f.category === "brokers" ? "broker listing" : f.category === "breaches" ? "account" : "finding"}${f.count === 1 ? "" : "s"}`,
    pack: f.pack,
  }));

  const scanLog = [
    `Scanning ${sourcesScanned}+ data-broker sites for ${input.name}…`,
    "Checking known breach databases…",
    "Searching dark-web markets & forums…",
    "Auditing page-one search & news results…",
    "Checking for impersonation & deepfakes…",
    "Compiling your exposure report…",
  ];

  return {
    name: input.name,
    sourcesScanned,
    totalFindings,
    categoriesAffected: findings.length,
    exposureScore,
    protectionScore,
    headline,
    worst,
    findings,
    fixPlan,
    scanLog,
  };
}

/** Convenience: the highest-rank severity present (for the surface's tone). */
export function mirrorSeverity(report: ScaryMirrorReport): RiskLevel {
  const max = report.findings.reduce((mx, f) => Math.max(mx, RISK_RANK[f.severity]), 0);
  return RANK_RISK[max];
}
