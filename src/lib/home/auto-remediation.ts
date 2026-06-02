/**
 * Autonomous remediation — what the fleet does on its own while you sleep.
 *
 * Given the live footprint and the customer's autonomy mode, this decides which
 * items the platform may act on WITHOUT a per-item sign-off, limited to safe,
 * reversible, internal actions: open a tracked case for a below-floor
 * recommendation, and file a broker opt-out for a below-floor, broker-removable
 * exposure (within the plan's allowance). Anything at/above the mode's approval
 * floor stays in the human queue. Pure + unit-tested; the route executes the plan
 * and writes every action to the audit log (the "continuous protection log").
 */

import type { Exposure, Recommendation, RemovalRequest, RiskLevel } from "@/lib/types";
import { needsApproval, type AutonomyMode } from "./autonomy";

export type AutoAction =
  | { kind: "open_case"; recId: string; title: string; riskLevel: RiskLevel }
  | { kind: "file_removal"; exposureId: string; brokerName: string; riskLevel: RiskLevel };

export interface AutoRemediationInput {
  /** Open recommendations (the live layer drops approved ones into cases). */
  recommendations: Recommendation[];
  exposures: Exposure[];
  removals: RemovalRequest[];
  mode: AutonomyMode;
  /** Remaining broker-removal allowance source (Infinity = unlimited). */
  brokerRemovalLimit: number;
  /** Whether the fleet may act at all (paid + advisor mode disables it). */
  enabled: boolean;
}

export interface AutoRemediationPlan {
  actions: AutoAction[];
  casesToOpen: number;
  removalsToFile: number;
}

/** Exposure sources remediated by a broker opt-out (vs. takedown/IR). */
const REMOVAL_SOURCES = new Set<Exposure["source"]>(["data_broker", "search_engine", "public_record"]);
/** Removal states that already count toward the allowance / mean "handled". */
const ACTIVE_REMOVAL = new Set(["removal_requested", "in_progress", "reappeared", "monitoring", "removed"]);

export function planAutoRemediation(input: AutoRemediationInput): AutoRemediationPlan {
  if (!input.enabled || input.mode === "advisor") {
    return { actions: [], casesToOpen: 0, removalsToFile: 0 };
  }
  const actions: AutoAction[] = [];

  // Recommendations below the mode's approval floor → open a tracked case.
  for (const r of input.recommendations) {
    if (needsApproval(r.riskLevel, input.mode)) continue;
    actions.push({ kind: "open_case", recId: r.id, title: r.title, riskLevel: r.riskLevel });
  }

  // Broker-removable exposures the allowance still covers → auto-file an opt-out.
  const activeRemovals = input.removals.filter((x) => ACTIVE_REMOVAL.has(x.status)).length;
  let budget = Number.isFinite(input.brokerRemovalLimit)
    ? Math.max(0, input.brokerRemovalLimit - activeRemovals)
    : Infinity;
  const alreadyFiled = new Set(input.removals.map((x) => x.exposureId).filter(Boolean));

  for (const e of input.exposures) {
    if (budget <= 0) break;
    if (!REMOVAL_SOURCES.has(e.source)) continue;
    if (e.status === "removed" || ACTIVE_REMOVAL.has(e.status)) continue;
    if (alreadyFiled.has(e.id)) continue;
    if (needsApproval(e.riskLevel, input.mode)) continue;
    actions.push({ kind: "file_removal", exposureId: e.id, brokerName: e.sourceName, riskLevel: e.riskLevel });
    budget -= 1;
  }

  return {
    actions,
    casesToOpen: actions.filter((a) => a.kind === "open_case").length,
    removalsToFile: actions.filter((a) => a.kind === "file_removal").length,
  };
}
