/**
 * Broker-removal intelligence.
 *
 * Joins the broker registry with the subject's removal requests to produce the
 * coverage table, removal pipeline, and category coverage the removals console
 * renders. This is what turns a thin "0/0" shell into a credible broker-removal
 * platform — showing how many brokers are covered, which are being worked, and
 * where each removal sits in the 30/60/90-day lifecycle. Pure and unit-tested.
 */

import { BROKERS, type Broker } from "./registry";
import type { ExposureStatus, RemovalRequest } from "@/lib/types";

export type BrokerState = "exposed" | "in_progress" | "removed" | "monitoring" | "reappeared" | "covered";

export interface BrokerRow {
  broker: Broker;
  state: BrokerState;
  /** Removal request backing this row, if one exists. */
  request?: RemovalRequest;
  /** ISO timestamp of the last lifecycle event, if any. */
  lastCheck?: string;
  /** Next scheduled re-check, if monitoring. */
  nextCheck?: string;
}

const STATE_FROM_STATUS: Partial<Record<ExposureStatus, BrokerState>> = {
  discovered: "exposed",
  triaged: "exposed",
  removal_requested: "in_progress",
  in_progress: "in_progress",
  removed: "removed",
  monitoring: "monitoring",
  reappeared: "reappeared",
};

/** Sort order — most-urgent states first. */
const STATE_ORDER: BrokerState[] = ["reappeared", "in_progress", "exposed", "monitoring", "removed", "covered"];

/**
 * Build one row per broker in the registry, joined to any matching removal
 * request. Brokers with no request are "covered" (monitored, nothing found).
 */
export function brokerTable(removals: RemovalRequest[], brokers: Broker[] = BROKERS): BrokerRow[] {
  const byName = new Map<string, RemovalRequest>();
  for (const r of removals) byName.set(r.brokerName.toLowerCase(), r);

  const rows: BrokerRow[] = brokers.map((broker) => {
    const req = byName.get(broker.name.toLowerCase());
    if (!req) return { broker, state: "covered" as BrokerState };
    return {
      broker,
      state: STATE_FROM_STATUS[req.status] ?? "covered",
      request: req,
      lastCheck: req.history.at(-1)?.at ?? req.submittedAt,
      nextCheck: req.nextCheckAt,
    };
  });

  return rows.sort(
    (a, b) => STATE_ORDER.indexOf(a.state) - STATE_ORDER.indexOf(b.state) || a.broker.name.localeCompare(b.broker.name),
  );
}

/* ── Removal pipeline ────────────────────────────────────────────────────── */

export interface PipelineStage {
  key: string;
  label: string;
  count: number;
}

/**
 * The removal lifecycle as a pipeline: Found → Submitted → Confirmed →
 * Monitoring → Reappeared. Counts come from the live removal set.
 */
export function removalPipeline(removals: RemovalRequest[]): PipelineStage[] {
  const c = (pred: (s: ExposureStatus) => boolean) => removals.filter((r) => pred(r.status)).length;
  return [
    { key: "found", label: "Found", count: c((s) => s === "discovered" || s === "triaged") },
    { key: "submitted", label: "Submitted", count: c((s) => s === "removal_requested" || s === "in_progress") },
    { key: "confirmed", label: "Confirmed", count: c((s) => s === "removed") },
    { key: "monitoring", label: "Monitoring", count: c((s) => s === "monitoring") },
    { key: "reappeared", label: "Reappeared", count: c((s) => s === "reappeared") },
  ];
}

/* ── Coverage summary ────────────────────────────────────────────────────── */

export interface CoverageSummary {
  totalBrokers: number;
  categories: { name: string; count: number }[];
  /** Brokers with an active removal in flight. */
  active: number;
  /** Brokers confirmed removed or under monitoring. */
  protectedCount: number;
  /** Brokers where data reappeared and needs re-filing. */
  reappeared: number;
  /** Removed+monitoring as a share of brokers that ever had an exposure, 0–100. */
  successRate: number;
}

export function coverageSummary(removals: RemovalRequest[], brokers: Broker[] = BROKERS): CoverageSummary {
  const byCat = new Map<string, number>();
  for (const b of brokers) byCat.set(b.category, (byCat.get(b.category) ?? 0) + 1);

  const active = removals.filter((r) => ["removal_requested", "in_progress"].includes(r.status)).length;
  const protectedCount = removals.filter((r) => ["removed", "monitoring"].includes(r.status)).length;
  const reappeared = removals.filter((r) => r.status === "reappeared").length;
  const everExposed = removals.length;
  const successRate = everExposed === 0 ? 100 : Math.round((protectedCount / everExposed) * 100);

  return {
    totalBrokers: brokers.length,
    categories: [...byCat.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    active,
    protectedCount,
    reappeared,
    successRate,
  };
}
