/**
 * Discovery pipeline.
 *
 * Runs a set of discovery sources concurrently, isolates failures, and dedupes
 * the combined findings against the known footprint and against each other.
 * Returns only genuinely new exposures/threats so the data layer can persist
 * them without creating duplicates.
 */

import type { Exposure, Threat } from "@/lib/types";
import {
  dedupeKey,
  type DiscoveryFinding,
  type DiscoverySource,
  type DiscoveryInput,
} from "./source";
import { BreachConnector } from "./breach-connector";
import {
  DarkWebConnector,
  DomainConnector,
  NewsConnector,
  SearchConnector,
  SocialConnector,
} from "./connectors";

/** Default source roster — every discovery layer the platform runs. */
export function defaultDiscoverySources(): DiscoverySource[] {
  return [
    new BreachConnector(),
    new SearchConnector(),
    new NewsConnector(),
    new SocialConnector(),
    new DomainConnector(),
    new DarkWebConnector(),
  ];
}

function threatKey(t: Pick<Threat, "kind" | "title">): string {
  return `${t.kind}::${t.title}`.toLowerCase();
}

export async function runDiscovery(
  input: DiscoveryInput,
  sources: DiscoverySource[] = defaultDiscoverySources(),
): Promise<DiscoveryFinding> {
  const settled = await Promise.allSettled(sources.map((s) => s.scan(input)));

  const exposures: Exposure[] = [];
  const threats: Threat[] = [];
  const log: string[] = [];

  settled.forEach((res, i) => {
    const src = sources[i];
    if (res.status === "fulfilled") {
      exposures.push(...res.value.exposures);
      threats.push(...res.value.threats);
      log.push(...res.value.log.map((l) => `[${src.id}] ${l}`));
    } else {
      log.push(`[${src.id}] ERROR: ${res.reason}`);
    }
  });

  // Dedupe exposures against the known footprint and within this batch.
  const seenExp = new Set(input.existing.map(dedupeKey));
  const newExposures: Exposure[] = [];
  for (const e of exposures) {
    const k = dedupeKey(e);
    if (seenExp.has(k)) continue;
    seenExp.add(k);
    newExposures.push(e);
  }

  // Dedupe threats within this batch (kind + title).
  const seenThreat = new Set<string>();
  const newThreats: Threat[] = [];
  for (const t of threats) {
    const k = threatKey(t);
    if (seenThreat.has(k)) continue;
    seenThreat.add(k);
    newThreats.push(t);
  }

  log.push(
    `Discovery complete: ${newExposures.length} new exposure(s), ${newThreats.length} new threat(s) from ${sources.length} source(s).`,
  );

  return { exposures: newExposures, threats: newThreats, log };
}
