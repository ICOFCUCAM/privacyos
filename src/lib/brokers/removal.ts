/**
 * Data-broker removal workflow.
 *
 * A deterministic state machine that drives an opt-out through its lifecycle and
 * schedules recurring reappearance re-checks at a 30 / 60 / 90-day cadence:
 *
 *   removal_requested → in_progress → removed → monitoring ⇄ (reappeared → …)
 *
 * Pure functions so the engine is fully unit-tested; the scheduler advances due
 * requests autonomously and the UI can force a tick ("Run re-check").
 */

import type { ExposureStatus, RemovalEvent, RemovalRequest } from "@/lib/types";

const DAY = 86_400_000;
const addDays = (iso: string, n: number) => new Date(new Date(iso).getTime() + n * DAY).toISOString();

/** Re-check cadence after the initial removal: 30, then 60, then 90+ days. */
const CADENCE = [30, 60, 90];

export function nextRecheckDays(req: RemovalRequest): number {
  const checks = req.history.filter((e) => e.status === "monitoring").length;
  return CADENCE[Math.min(checks + 1, CADENCE.length - 1)];
}

/** Build a fresh opt-out request for a broker. */
export function createRemoval(
  brokerName: string,
  opts: { subjectId: string; exposureId?: string; now?: string },
): Omit<RemovalRequest, "id"> {
  const now = opts.now ?? new Date().toISOString();
  return {
    subjectId: opts.subjectId,
    exposureId: opts.exposureId,
    brokerName,
    status: "removal_requested",
    submittedAt: now,
    nextCheckAt: undefined,
    history: [{ at: now, status: "removal_requested", note: `Opt-out filed with ${brokerName}.` }],
  };
}

/** Whether a request should be acted on at `now` (process or re-check). */
export function isRemovalDue(req: RemovalRequest, now: string): boolean {
  if (req.status === "removal_requested" || req.status === "in_progress" || req.status === "reappeared") {
    return true;
  }
  if ((req.status === "removed" || req.status === "monitoring") && req.nextCheckAt) {
    return new Date(now).getTime() >= new Date(req.nextCheckAt).getTime();
  }
  return false;
}

/**
 * Advance a request by one tick. `reappeared` is decided by the caller (a
 * discovery re-scan in production, a deterministic predicate in demo/tests).
 */
export function advanceRemoval(
  req: RemovalRequest,
  opts: { now?: string; reappeared?: boolean } = {},
): RemovalRequest {
  const now = opts.now ?? new Date().toISOString();
  const append = (status: ExposureStatus, note: string): RemovalEvent[] => [
    ...req.history,
    { at: now, status, note },
  ];

  switch (req.status) {
    case "removal_requested":
      return { ...req, status: "in_progress", history: append("in_progress", "Broker acknowledged the request; processing removal.") };

    case "in_progress":
      return {
        ...req,
        status: "removed",
        nextCheckAt: addDays(now, CADENCE[0]),
        history: append("removed", `Listing removed. First reappearance re-check in ${CADENCE[0]} days.`),
      };

    case "removed":
    case "monitoring":
      if (opts.reappeared) {
        return { ...req, status: "reappeared", nextCheckAt: now, history: append("reappeared", "Listing reappeared — re-filing opt-out.") };
      }
      {
        const days = nextRecheckDays(req);
        return {
          ...req,
          status: "monitoring",
          nextCheckAt: addDays(now, days),
          history: append("monitoring", `Re-check passed — still removed. Next re-check in ${days} days.`),
        };
      }

    case "reappeared":
      return { ...req, status: "removal_requested", submittedAt: now, nextCheckAt: undefined, history: append("removal_requested", "Opt-out re-filed after reappearance.") };

    default:
      return req;
  }
}

/** Deterministic reappearance predicate for demo/scheduled runs. */
export function shouldReappear(brokerName: string): boolean {
  let h = 0;
  for (let i = 0; i < brokerName.length; i++) h = (h * 31 + brokerName.charCodeAt(i)) >>> 0;
  return h % 5 === 0; // ~20% of brokers re-list
}
