/**
 * Entity resolution for discovered exposures.
 *
 * Different discovery layers frequently surface the *same* underlying exposure
 * (the same broker listing seen by two crawlers, the same article via search and
 * news). Exact content-keys miss these near-duplicates. This module clusters
 * exposures that refer to one real-world entity and picks a representative, so
 * the stored footprint — and therefore every score and report — reflects unique
 * exposures rather than inflated raw signal. Pure and unit-tested.
 */

import type { Exposure, ExposureSource } from "@/lib/types";

export interface ExposureCluster {
  id: string;
  representative: Exposure;
  members: Exposure[];
  sources: ExposureSource[];
}

const STOP = new Set(["the", "a", "an", "of", "and", "in", "on", "for", "to", "with", "at"]);

/** Normalize free text for comparison: lowercase, strip punctuation, drop stopwords. */
export function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s@.]/gu, " ")
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 1 && !STOP.has(t)),
  );
}

/** Jaccard similarity of two token sets (0..1). */
export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function host(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).host.replace(/^www\./, "").toLowerCase();
  } catch {
    return undefined;
  }
}

/**
 * Whether two exposures denote the same real-world entity. Conservative: only
 * exposures of the same category can match (a name and an address from one
 * broker are distinct exposures).
 */
export function sameEntity(a: Exposure, b: Exposure): boolean {
  if (a.category !== b.category) return false;

  const hostA = host(a.url);
  const hostB = host(b.url);
  const sim = jaccard(tokenize(a.snippet), tokenize(b.snippet));

  // Same source + same broker/site name: likely the same listing.
  if (a.source === b.source && a.sourceName.toLowerCase() === b.sourceName.toLowerCase()) {
    if (hostA && hostB) return hostA === hostB;
    return sim >= 0.5;
  }

  // Cross-source: the same page surfaced by two layers, or near-identical text.
  if (hostA && hostB && hostA === hostB) return true;
  return sim >= 0.8;
}

/** Pick the representative of a cluster: highest risk, then most recently seen. */
function pickRepresentative(members: Exposure[]): Exposure {
  const RANK = { low: 0, medium: 1, high: 2, critical: 3 } as const;
  return [...members].sort((x, y) => {
    const r = RANK[y.riskLevel] - RANK[x.riskLevel];
    if (r !== 0) return r;
    return new Date(y.lastSeenAt).getTime() - new Date(x.lastSeenAt).getTime();
  })[0];
}

/** Cluster exposures by entity using union-find over the `sameEntity` relation. */
export function clusterExposures(exposures: Exposure[]): ExposureCluster[] {
  const parent = exposures.map((_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  const union = (i: number, j: number) => {
    parent[find(i)] = find(j);
  };

  for (let i = 0; i < exposures.length; i++) {
    for (let j = i + 1; j < exposures.length; j++) {
      if (sameEntity(exposures[i], exposures[j])) union(i, j);
    }
  }

  const groups = new Map<number, Exposure[]>();
  exposures.forEach((e, i) => {
    const root = find(i);
    const list = groups.get(root) ?? [];
    list.push(e);
    groups.set(root, list);
  });

  return [...groups.values()].map((members) => {
    const representative = pickRepresentative(members);
    return {
      id: representative.id,
      representative,
      members,
      sources: [...new Set(members.map((m) => m.source))],
    };
  });
}

/** Collapse near-duplicates, keeping one representative exposure per entity. */
export function dedupeExposures(exposures: Exposure[]): Exposure[] {
  return clusterExposures(exposures).map((c) => c.representative);
}

/** Drop exposures that resolve to an entity already present in `existing`. */
export function removeKnownEntities(candidates: Exposure[], existing: Exposure[]): Exposure[] {
  return candidates.filter((c) => !existing.some((e) => sameEntity(c, e)));
}
