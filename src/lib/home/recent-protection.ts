/**
 * "While you were away" — turning the activity feed into a felt sense of safety.
 *
 * Summarizes the fleet's recent autonomous actions (last 24h by default) into a
 * plain headline + counts, so when the customer opens the dashboard they see
 * what was handled overnight rather than a static score. Pure + unit-tested.
 */

import type { AgentAction } from "@/lib/suite-types";

export interface RecentProtection {
  /** Total completed autonomous actions in the window. */
  total: number;
  removals: number;
  cases: number;
  scans: number;
  monitors: number;
  /** Most recent actions, newest first, for the panel's mini-feed. */
  latest: AgentAction[];
}

export function summarizeRecentProtection(
  actions: AgentAction[],
  opts: { now?: number; windowHours?: number; limit?: number } = {},
): RecentProtection {
  const now = opts.now ?? Date.now();
  const windowMs = (opts.windowHours ?? 24) * 3_600_000;

  const recent = actions
    .filter((a) => a.status === "completed")
    .filter((a) => {
      const t = new Date(a.createdAt).getTime();
      return Number.isFinite(t) && now - t <= windowMs && now - t >= 0;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const count = (k: AgentAction["kind"]) => recent.filter((a) => a.kind === k).length;

  return {
    total: recent.length,
    removals: count("remove"),
    cases: count("escalate"),
    scans: count("scan"),
    monitors: count("monitor"),
    latest: recent.slice(0, opts.limit ?? 3),
  };
}
