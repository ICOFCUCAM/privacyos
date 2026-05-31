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
import { dedupeExposures, removeKnownEntities } from "./entity-resolution";
import { BreachConnector } from "./breach-connector";
import { CertTransparencyConnector } from "./cert-transparency-connector";
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
    new CertTransparencyConnector(),
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

  // Exact-dedupe against the known footprint and within this batch.
  const seenExp = new Set(input.existing.map(dedupeKey));
  const exactNew: Exposure[] = [];
  for (const e of exposures) {
    const k = dedupeKey(e);
    if (seenExp.has(k)) continue;
    seenExp.add(k);
    exactNew.push(e);
  }

  // Entity resolution: collapse cross-source near-duplicates within the batch,
  // then drop any that resolve to an entity already in the footprint.
  const clustered = dedupeExposures(exactNew);
  const newExposures = removeKnownEntities(clustered, input.existing);
  const merged = exactNew.length - newExposures.length;

  // Dedupe threats against the known footprint AND within this batch
  // (kind + title), so repeated cycles never re-emit the same threat.
  const seenThreat = new Set<string>((input.existingThreats ?? []).map(threatKey));
  const newThreats: Threat[] = [];
  for (const t of threats) {
    const k = threatKey(t);
    if (seenThreat.has(k)) continue;
    seenThreat.add(k);
    newThreats.push(t);
  }

  log.push(
    `Discovery complete: ${newExposures.length} new exposure(s)` +
      (merged > 0 ? ` (${merged} merged by entity resolution)` : "") +
      `, ${newThreats.length} new threat(s) from ${sources.length} source(s).`,
  );

  return { exposures: newExposures, threats: newThreats, log };
}
