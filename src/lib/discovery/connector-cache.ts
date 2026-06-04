/**
 * Per-connector finding cache.
 *
 * A decorator that wraps a DiscoverySource and caches its finding per
 * (user, subject, connector) so re-scans don't re-spend a paid API credit until
 * the result is stale. The cache is the main cost control for the SerpApi-backed
 * connectors (reverse-image, autocomplete, multi-engine), alongside entitlement
 * gating. Mirrors the SERP cache:
 *   - No authenticated session (demo / anon / cron without a user session) →
 *     pass straight through to the wrapped source; the source's own key-gating
 *     still applies, so demo stays free.
 *   - Authenticated → serve a fresh cache row, else run the source once and
 *     persist its finding.
 * Cache IO never blocks discovery — any failure falls back to a live scan.
 */

import { getCacheSession } from "@/lib/data/cache-session";
import type { DiscoveryFinding, DiscoveryInput, DiscoverySource } from "./source";

/** Default freshness window for a cached connector finding (24h). */
export const DISCOVERY_TTL_MS = 24 * 60 * 60 * 1000;

/** Whether a cache row fetched at `fetchedAt` is still within the TTL. */
export function isCacheFresh(fetchedAt: string, now = Date.now(), ttl = DISCOVERY_TTL_MS): boolean {
  const t = new Date(fetchedAt).getTime();
  return !Number.isNaN(t) && now - t < ttl;
}

export class CachedSource implements DiscoverySource {
  readonly id: string;
  readonly name: string;

  constructor(
    private readonly inner: DiscoverySource,
    private readonly ttlMs: number = DISCOVERY_TTL_MS,
  ) {
    this.id = inner.id;
    this.name = inner.name;
  }

  async scan(input: DiscoveryInput): Promise<DiscoveryFinding> {
    const session = await getCacheSession();
    // No session (demo / anon / cron) → run the source directly (uncached).
    if (!session) return this.inner.scan(input);
    const { db, userId } = session;

    // 1) Serve a fresh cache row if present.
    try {
      const { data: row } = await db
        .from("discovery_cache")
        .select("finding,fetched_at")
        .eq("subject_id", input.subject.id)
        .eq("connector_id", this.id)
        .maybeSingle();
      if (row && isCacheFresh(row.fetched_at, Date.now(), this.ttlMs)) {
        return row.finding as DiscoveryFinding;
      }
    } catch {
      /* cache read failed — fall through to a live scan */
    }

    // 2) Live scan (exactly once on a miss).
    const fresh = await this.inner.scan(input);

    // 3) Persist best-effort; never block discovery on a cache write.
    try {
      await db.from("discovery_cache").upsert(
        {
          user_id: userId,
          subject_id: input.subject.id,
          connector_id: this.id,
          finding: fresh,
          fetched_at: new Date().toISOString(),
        },
        { onConflict: "user_id,subject_id,connector_id" },
      );
    } catch {
      /* ignore persist failure */
    }

    return fresh;
  }
}
