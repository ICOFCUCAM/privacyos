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
import { ReverseImageConnector } from "./reverse-image-connector";
import { AutocompleteConnector } from "./autocomplete-connector";
import { MultiEngineSerpConnector } from "./multi-engine-connector";
import { CachedSource } from "./connector-cache";
import type { Entitlements } from "@/lib/billing/entitlements";
import {
  DarkWebConnector,
  DomainConnector,
  NewsConnector,
  SearchConnector,
  SocialConnector,
} from "./connectors";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * How long a paid SerpApi finding stays cached, by plan — the cadence half of
 * the cost control. Higher tiers refresh more often; lower tiers less, so spend
 * tracks plan value. Unknown/demo defaults to daily.
 */
function serpCacheTtl(ent?: Entitlements): number {
  if (!ent) return DAY_MS;
  if (ent.category === "executive" || ent.category === "business") return DAY_MS;        // daily
  if (ent.category === "reputation" || ent.planId === "premium" || ent.planId === "family") return 7 * DAY_MS; // weekly
  return 30 * DAY_MS;                                                                     // monthly
}

/**
 * Default source roster — every discovery layer the platform runs.
 *
 * The keyless layers (breach, search, news, social, domain, cert-transparency,
 * dark-web) always run. The paid SerpApi-backed connectors are gated by plan
 * entitlement AND wrapped in a TTL cache, so they only spend a credit for
 * subjects whose plan includes the capability, and at most once per cache
 * window. Passing no entitlements (demo / admin / tests) runs the full roster so
 * the product stays fully explorable.
 */
export function defaultDiscoverySources(ent?: Entitlements): DiscoverySource[] {
  const sources: DiscoverySource[] = [
    new BreachConnector(),
    new SearchConnector(),
    new NewsConnector(),
    new SocialConnector(),
    new DomainConnector(),
    new CertTransparencyConnector(),
    new DarkWebConnector(),
  ];

  // No entitlements supplied → full roster (demo/back-compat). Otherwise gate.
  const has = (f: keyof Entitlements["features"]) => !ent || ent.features[f];
  const ttl = serpCacheTtl(ent);

  // Reputation defamation signal — ReputationOS + personal Plus/Premium/Family.
  if (has("reputation")) sources.push(new CachedSource(new AutocompleteConnector(), ttl));
  // Broad cross-engine exposure — the "deep" discovery tiers.
  if (has("deep_web") || has("executive") || has("business")) {
    sources.push(new CachedSource(new MultiEngineSerpConnector(), ttl));
  }
  // Reverse-image impersonation — Executive + personal deep-web (Premium/Family).
  if (has("executive") || has("deep_web")) {
    sources.push(new CachedSource(new ReverseImageConnector(), ttl));
  }

  return sources;
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
