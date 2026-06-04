/**
 * Response-SLA clock.
 *
 * The platform-performance SLAs (MTTD/MTTR/uptime) say how fast the system *can*
 * act. This is the operational counterpart enterprises actually govern against:
 * every open case carries a response deadline derived from its risk, and the
 * engine watches the clock — flagging at-risk items and auto-escalating breaches.
 * Pure + unit-tested; the scheduler acts on it, the Compliance page renders it.
 */

import type { Case, CaseStatus, RiskLevel } from "@/lib/types";

/** Response-time target (hours from open) per risk level. */
export const RESPONSE_SLA_HOURS: Record<RiskLevel, number> = {
  critical: 24,
  high: 72,
  medium: 168, // 7 days
  low: 720, // 30 days
};

/** Case statuses that still owe a response (i.e. the SLA clock is running). */
const OPEN_STATUSES = new Set<CaseStatus>(["open", "in_progress", "awaiting_response"]);

export type SlaStatus = "on_track" | "at_risk" | "breached";

export interface CaseSla {
  id: string;
  title: string;
  riskLevel: RiskLevel;
  assignedAgent: Case["assignedAgent"];
  openedAt: string;
  dueAt: string;
  /** Hours until the deadline; negative once breached. */
  hoursRemaining: number;
  status: SlaStatus;
}

const HOUR = 3_600_000;

/** SLA position of one case relative to `now` (ms). Null if its clock isn't running. */
export function caseSla(c: Case, now: number = Date.now()): CaseSla | null {
  if (!OPEN_STATUSES.has(c.status)) return null;
  const opened = new Date(c.createdAt).getTime();
  if (!Number.isFinite(opened)) return null;
  const windowH = RESPONSE_SLA_HOURS[c.riskLevel];
  const dueMs = opened + windowH * HOUR;
  const hoursRemaining = Math.round(((dueMs - now) / HOUR) * 10) / 10;
  const status: SlaStatus =
    hoursRemaining <= 0 ? "breached" : hoursRemaining <= windowH * 0.25 ? "at_risk" : "on_track";
  return {
    id: c.id,
    title: c.title,
    riskLevel: c.riskLevel,
    assignedAgent: c.assignedAgent,
    openedAt: c.createdAt,
    dueAt: new Date(dueMs).toISOString(),
    hoursRemaining,
    status,
  };
}

export interface SlaClockReport {
  items: CaseSla[];
  onTrack: number;
  atRisk: number;
  breached: number;
  /** Share of running clocks not breached, 0–100 (100 when none are running). */
  attainment: number;
}

/** Roll the SLA clock over a set of cases, worst (breached, soonest) first. */
export function caseSlaReport(cases: Case[], now: number = Date.now()): SlaClockReport {
  const items = cases
    .map((c) => caseSla(c, now))
    .filter((s): s is CaseSla => s !== null)
    .sort((a, b) => a.hoursRemaining - b.hoursRemaining);
  const breached = items.filter((i) => i.status === "breached").length;
  const atRisk = items.filter((i) => i.status === "at_risk").length;
  const onTrack = items.filter((i) => i.status === "on_track").length;
  const attainment = items.length === 0 ? 100 : Math.round(((items.length - breached) / items.length) * 100);
  return { items, onTrack, atRisk, breached, attainment };
}
