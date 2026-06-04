/**
 * Discovery source abstraction.
 *
 * A DiscoverySource scans one external surface (breach DB, data broker, search
 * engine, social platform, …) for a subject and returns normalized findings.
 * The pipeline (see `pipeline.ts`) runs many sources concurrently, dedupes the
 * results against the known footprint, and hands new findings to the data layer
 * for persistence. This is the seam where the platform becomes "real".
 */

import type { Exposure, Subject, Threat } from "@/lib/types";

/**
 * INTERNAL SerpApi cost/abuse backstop. A connector reserves the number of live
 * searches it's about to make; `false` means the account's (invisible, generous)
 * ceiling is hit, so the connector skips its paid calls and degrades to cache /
 * keyless layers. Absent (demo / tests / keyless) = uncapped.
 */
export interface SerpMeter {
  consume(cost: number): Promise<boolean>;
}

export interface DiscoveryInput {
  subject: Subject;
  /** The already-known footprint, so sources/pipeline can avoid duplicates. */
  existing: Exposure[];
  /** Already-known threats, so the pipeline doesn't re-emit them each run. */
  existingThreats?: Threat[];
  /** Optional internal SerpApi budget meter (see SerpMeter). */
  meter?: SerpMeter;
}

export interface DiscoveryFinding {
  exposures: Exposure[];
  threats: Threat[];
  log: string[];
}

export interface DiscoverySource {
  readonly id: string;
  readonly name: string;
  scan(input: DiscoveryInput): Promise<DiscoveryFinding>;
}

/**
 * Content signature used to dedupe an exposure across scans and against the
 * stored footprint. Deliberately content-based (not id-based) because stored
 * rows have database UUIDs while freshly discovered items do not.
 */
export function dedupeKey(e: Pick<Exposure, "source" | "sourceName" | "snippet">): string {
  return `${e.source}::${e.sourceName}::${e.snippet}`.toLowerCase();
}
