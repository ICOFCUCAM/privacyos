/**
 * Command Center intelligence layer.
 *
 * Pure, deterministic transforms that turn the raw domain dataset (exposures,
 * threats, removals, agent runs/actions) into the operational intelligence the
 * Digital Risk Operations Center renders: timelines, discovery velocity,
 * remediation progress, source rankings, the identity attack surface and a live
 * agent roster. Keeping this side-effect-free makes every visualization
 * unit-testable and guarantees no panel is ever "empty" by construction.
 */

import type {
  AgentKind,
  AgentState,
  Exposure,
  ExposureCategory,
  ExposureStatus,
  RemovalRequest,
  RiskLevel,
  Threat,
} from "@/lib/types";
import type { AgentAction } from "@/lib/suite-types";

export const RISK_LEVELS: RiskLevel[] = ["low", "medium", "high", "critical"];

const DAY_MS = 86_400_000;

function emptyLevels(): Record<RiskLevel, number> {
  return { low: 0, medium: 0, high: 0, critical: 0 };
}

function daysAgo(iso: string, now: number): number {
  return Math.floor((now - new Date(iso).getTime()) / DAY_MS);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function shortLabel(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/* ── Timelines ───────────────────────────────────────────────────────────── */

export interface DayBucket {
  /** ISO date (yyyy-mm-dd) for the bucket. */
  date: string;
  /** Short human label, e.g. "May 26". */
  label: string;
  total: number;
  byLevel: Record<RiskLevel, number>;
}

/**
 * Bucket dated, risk-classified items into `days` daily buckets ending today.
 * Items outside the window are ignored. Always returns exactly `days` buckets so
 * the resulting chart has a stable, fully-populated x-axis.
 */
export function bucketByDay<T>(
  items: T[],
  getDate: (t: T) => string,
  getLevel: (t: T) => RiskLevel,
  days = 30,
  now: number = Date.now(),
): DayBucket[] {
  const buckets: DayBucket[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * DAY_MS);
    buckets.push({
      date: d.toISOString().slice(0, 10),
      label: shortLabel(d),
      total: 0,
      byLevel: emptyLevels(),
    });
  }
  const index = new Map(buckets.map((b, i) => [b.date, i]));
  for (const item of items) {
    const date = new Date(getDate(item)).toISOString().slice(0, 10);
    const i = index.get(date);
    if (i === undefined) continue;
    buckets[i].total += 1;
    buckets[i].byLevel[getLevel(item)] += 1;
  }
  return buckets;
}

export function exposureTimeline(exposures: Exposure[], days = 30, now = Date.now()): DayBucket[] {
  return bucketByDay(exposures, (e) => e.discoveredAt, (e) => e.riskLevel, days, now);
}

export function threatTimeline(threats: Threat[], days = 30, now = Date.now()): DayBucket[] {
  return bucketByDay(threats, (t) => t.detectedAt, (t) => t.riskLevel, days, now);
}

/* ── Discovery velocity ──────────────────────────────────────────────────── */

export interface Velocity {
  /** New discoveries per day across the window (oldest → newest). */
  perDay: number[];
  /** Total discoveries in the trailing window. */
  windowTotal: number;
  /** Discoveries in the most-recent 7 days. */
  last7: number;
  /** Discoveries in the prior 7 days (days 8–14). */
  prev7: number;
  /** Percent change last7 vs prev7 (rounded). 0 when prev7 is 0. */
  deltaPct: number;
}

/** Discovery velocity from exposures (and optionally threats) over `days`. */
export function discoveryVelocity(
  exposures: Exposure[],
  threats: Threat[] = [],
  days = 30,
  now = Date.now(),
): Velocity {
  const dated = [
    ...exposures.map((e) => e.discoveredAt),
    ...threats.map((t) => t.detectedAt),
  ];
  const perDay = new Array(days).fill(0) as number[];
  let last7 = 0;
  let prev7 = 0;
  for (const iso of dated) {
    const ago = daysAgo(iso, now);
    if (ago >= 0 && ago < days) perDay[days - 1 - ago] += 1;
    if (ago >= 0 && ago < 7) last7 += 1;
    else if (ago >= 7 && ago < 14) prev7 += 1;
  }
  const deltaPct = prev7 === 0 ? 0 : Math.round(((last7 - prev7) / prev7) * 100);
  return { perDay, windowTotal: perDay.reduce((a, b) => a + b, 0), last7, prev7, deltaPct };
}

/* ── Remediation progress ────────────────────────────────────────────────── */

export interface RemediationProgress {
  total: number;
  removed: number;
  inProgress: number;
  monitoring: number;
  reappeared: number;
  /** Share of items neutralized (removed + monitoring) as a 0–100 percent. */
  percentComplete: number;
  stages: { key: string; label: string; value: number; level: RiskLevel | "neutral" }[];
}

const NEUTRALIZED: ExposureStatus[] = ["removed", "monitoring"];
const ACTIVE_REMOVAL: ExposureStatus[] = ["removal_requested", "in_progress"];

export function remediationProgress(removals: RemovalRequest[]): RemediationProgress {
  const count = (pred: (s: ExposureStatus) => boolean) =>
    removals.filter((r) => pred(r.status)).length;
  const removed = count((s) => s === "removed");
  const monitoring = count((s) => s === "monitoring");
  const inProgress = count((s) => ACTIVE_REMOVAL.includes(s));
  const reappeared = count((s) => s === "reappeared");
  const total = removals.length;
  const neutralized = count((s) => NEUTRALIZED.includes(s));
  const percentComplete = total === 0 ? 0 : Math.round((neutralized / total) * 100);
  return {
    total,
    removed,
    inProgress,
    monitoring,
    reappeared,
    percentComplete,
    stages: [
      { key: "removed", label: "Removed", value: removed, level: "low" },
      { key: "monitoring", label: "Monitoring", value: monitoring, level: "low" },
      { key: "in_progress", label: "In progress", value: inProgress, level: "medium" },
      { key: "reappeared", label: "Reappeared", value: reappeared, level: "critical" },
    ],
  };
}

/* ── Exposure source ranking ─────────────────────────────────────────────── */

export interface SourceRank {
  source: string;
  label: string;
  count: number;
  /** Share of all exposures, 0–100. */
  percent: number;
  /** Dominant severity among this source's exposures. */
  topLevel: RiskLevel;
}

const SOURCE_LABEL: Record<string, string> = {
  data_broker: "Data Brokers",
  search_engine: "People Search Sites",
  social_media: "Social Media",
  forum: "Forums",
  breach_db: "Breach Databases",
  dark_web: "Dark Web",
  news: "News & Press",
  public_record: "Public Records",
  archive: "Archives",
  ai_generated: "Synthetic Media",
};

function dominantLevel(levels: RiskLevel[]): RiskLevel {
  const rank: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };
  return levels.reduce<RiskLevel>((acc, l) => (rank[l] > rank[acc] ? l : acc), "low");
}

export function topExposureSources(exposures: Exposure[], limit = 6): SourceRank[] {
  const groups = new Map<string, RiskLevel[]>();
  for (const e of exposures) {
    const list = groups.get(e.source) ?? [];
    list.push(e.riskLevel);
    groups.set(e.source, list);
  }
  const total = exposures.length || 1;
  return [...groups.entries()]
    .map(([source, levels]) => ({
      source,
      label: SOURCE_LABEL[source] ?? source,
      count: levels.length,
      percent: Math.round((levels.length / total) * 100),
      topLevel: dominantLevel(levels),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/* ── Identity attack surface ─────────────────────────────────────────────── */

export interface SurfaceAxis {
  key: string;
  label: string;
  count: number;
  /** Summed risk weight for this axis. */
  weight: number;
}

const SURFACE_MAP: Record<ExposureCategory, string> = {
  name: "Identity",
  alias: "Identity",
  username: "Identity",
  email: "Contact",
  phone: "Contact",
  address: "Location",
  family: "Family",
  photo: "Media",
  employer: "Professional",
  financial: "Financial",
  credential: "Credentials",
};

const SURFACE_AXES = ["Identity", "Contact", "Location", "Credentials", "Financial", "Professional", "Family", "Media"];

/**
 * Project exposures onto fixed identity attack-surface axes. Always returns all
 * axes (zero-filled) so the radar renders a complete polygon.
 */
export function attackSurface(exposures: Exposure[]): SurfaceAxis[] {
  const counts = new Map<string, { count: number; weight: number }>();
  for (const axis of SURFACE_AXES) counts.set(axis, { count: 0, weight: 0 });
  for (const e of exposures) {
    const axis = SURFACE_MAP[e.category] ?? "Identity";
    const cur = counts.get(axis)!;
    cur.count += 1;
    cur.weight += e.riskScore;
  }
  return SURFACE_AXES.map((label) => ({
    key: label.toLowerCase(),
    label,
    count: counts.get(label)!.count,
    weight: counts.get(label)!.weight,
  }));
}

/* ── Agent roster ────────────────────────────────────────────────────────── */

export interface AgentRosterEntry {
  kind: AgentKind;
  name: string;
  description: string;
  status: AgentState["status"];
  online: boolean;
  itemsHandled: number;
  lastRunAt?: string;
  /** Most recent action summary, used as the agent's "current task". */
  currentTask?: string;
  currentTaskAt?: string;
  /** Number of completed actions attributed to this agent. */
  completedActions: number;
}

const TASK_VERB: Record<string, string> = {
  scan: "Scanning",
  analyze: "Analyzing",
  remove: "Processing removals",
  draft_legal: "Generating requests",
  monitor: "Monitoring",
  escalate: "Escalating",
};

/**
 * Fuse agent state with the recent action stream so each agent shows a live
 * status, a current task and its completed-action count.
 */
export function agentRoster(agents: AgentState[], actions: AgentAction[]): AgentRosterEntry[] {
  const byAgent = new Map<AgentKind, AgentAction[]>();
  for (const a of actions) {
    const list = byAgent.get(a.agent) ?? [];
    list.push(a);
    byAgent.set(a.agent, list);
  }
  return agents.map((agent) => {
    const list = (byAgent.get(agent.kind) ?? []).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const latest = list[0];
    const online = agent.status === "running" || agent.status === "idle";
    const verb = latest ? TASK_VERB[latest.kind] ?? "Working" : undefined;
    return {
      kind: agent.kind,
      name: agent.name,
      description: agent.description,
      status: agent.status,
      online,
      itemsHandled: agent.itemsHandled,
      lastRunAt: agent.lastRunAt,
      currentTask: latest ? `${verb} · ${latest.summary}` : undefined,
      currentTaskAt: latest?.createdAt,
      completedActions: list.filter((a) => a.status === "completed").length,
    };
  });
}

export function onlineAgentCount(roster: AgentRosterEntry[]): number {
  return roster.filter((a) => a.online).length;
}
