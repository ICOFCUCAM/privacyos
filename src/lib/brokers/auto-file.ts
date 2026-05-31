/**
 * Auto-file selection for the scheduler.
 *
 * Decides which discovered exposures warrant an automatically-filed broker
 * opt-out: broker / public-record / search-engine exposures that map to a known
 * registry broker and don't already have a removal in flight. Pure and
 * unit-tested — the scheduler calls this, then persists the resulting requests,
 * so the removal pipeline populates itself from real discoveries.
 */

import { BROKERS, findBroker, type Broker } from "./registry";
import { createRemoval } from "./removal";
import type { Exposure, ExposureSource, RemovalRequest } from "@/lib/types";

/** Exposure sources that map to a filable data-broker opt-out. */
const REMOVABLE_SOURCES: ExposureSource[] = ["data_broker", "public_record", "search_engine"];

/** Resolve the registry broker for an exposure by sourceName (fuzzy). */
export function brokerForExposure(e: Exposure): Broker | undefined {
  const direct = findBroker(e.sourceName);
  if (direct) return direct;
  const name = e.sourceName.toLowerCase();
  return BROKERS.find((b) => name.includes(b.name.toLowerCase()) || name.includes(b.id));
}

export interface AutoFilePlan {
  /** New removal requests to persist (without ids). */
  requests: Omit<RemovalRequest, "id">[];
  /** Exposures matched to a broker and queued for filing. */
  matched: number;
  /** Removable exposures that had no registry match (need a connector). */
  unmatched: number;
}

/**
 * Build the set of removals to auto-file for a subject. Skips exposures that
 * already have a removal (by broker name) so repeated cycles don't double-file.
 * Honors an optional remaining-allowance cap (plan limit minus existing).
 */
export function planAutoFilings(
  subjectId: string,
  exposures: Exposure[],
  existingRemovals: RemovalRequest[],
  opts: { now?: string; maxNew?: number } = {},
): AutoFilePlan {
  const filedBrokers = new Set(existingRemovals.map((r) => r.brokerName.toLowerCase()));
  const removable = exposures.filter((e) => REMOVABLE_SOURCES.includes(e.source));

  const requests: Omit<RemovalRequest, "id">[] = [];
  let matched = 0;
  let unmatched = 0;
  const queued = new Set<string>();

  for (const e of removable) {
    const broker = brokerForExposure(e);
    if (!broker) {
      unmatched += 1;
      continue;
    }
    const key = broker.name.toLowerCase();
    // Skip if already filed or already queued this cycle.
    if (filedBrokers.has(key) || queued.has(key)) continue;
    if (opts.maxNew !== undefined && requests.length >= opts.maxNew) break;
    requests.push(createRemoval(broker.name, { subjectId, exposureId: e.id, now: opts.now }));
    queued.add(key);
    matched += 1;
  }

  return { requests, matched, unmatched };
}
