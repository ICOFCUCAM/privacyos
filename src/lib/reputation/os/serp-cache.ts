/**
 * SERP ranking cache.
 *
 * A live SERP lookup costs a provider credit (and ~15s for Olostep's scrape),
 * so a subject's page-one rankings are cached per (user, subject) and only
 * refreshed when stale. Live-aware: with no Supabase session it falls straight
 * through to the live source (which itself falls back to the deterministic
 * model). Never throws — caching must not break the SEO page.
 */

import { getCacheSession } from "@/lib/data/cache-session";
import { resolveSerpSource, type SerpResult, type SerpProvider, type SerpSource } from "./serp-connector";

/** How long cached rankings stay fresh. */
export const SERP_TTL_MS = 12 * 60 * 60 * 1000;

export interface CachedRankings {
  results: SerpResult[];
  live: boolean;
  provider: SerpProvider;
  /** Set when the results came from cache (vs. a fresh fetch). */
  cachedAt?: string;
}

/** Whether a cache row fetched at `fetchedAt` is still within the TTL. */
export function isFresh(fetchedAt: string, now = Date.now(), ttl = SERP_TTL_MS): boolean {
  const t = new Date(fetchedAt).getTime();
  return !Number.isNaN(t) && now - t < ttl;
}

/**
 * Resolve a subject's page-one rankings, using the cache when fresh and
 * refreshing (and persisting) a live result when stale. In demo / unauthenticated
 * mode, skips the cache and returns the live source's result directly.
 */
export async function getRankings(
  query: string,
  subjectId: string,
  source: SerpSource = resolveSerpSource(),
  now = Date.now(),
): Promise<CachedRankings> {
  // No session → don't spend a paid SERP credit uncached; use the model.
  const noLive: CachedRankings = { results: [], live: false, provider: "none" };
  const session = await getCacheSession();
  if (!session) return noLive;
  try {
    const { db, userId } = session;

    const { data: row } = await db
      .from("serp_cache")
      .select("query,provider,results,fetched_at")
      .eq("subject_id", subjectId)
      .maybeSingle();

    if (row && row.query === query && isFresh(row.fetched_at, now)) {
      return { results: (row.results as SerpResult[]) ?? [], live: true, provider: row.provider as SerpProvider, cachedAt: row.fetched_at };
    }

    const fresh = await source.search(query);
    // Only persist real (live) results — never cache the deterministic fallback.
    if (fresh.live && fresh.results.length > 0) {
      await db.from("serp_cache").upsert(
        { user_id: userId, subject_id: subjectId, query, provider: fresh.provider, results: fresh.results, fetched_at: new Date(now).toISOString() },
        { onConflict: "user_id,subject_id" },
      );
    }
    return fresh;
  } catch {
    return noLive;
  }
}
