/**
 * Journalist-contact cache.
 *
 * A Hunter.io lookup costs a credit, and contacts change slowly, so per-domain
 * results are cached per user for 30 days. Live-aware: with no Supabase session
 * (or no Hunter key) it falls straight through to the source (a no-op). Never
 * throws — enrichment must not break the Media page.
 */

import { getCacheSession } from "@/lib/data/cache-session";
import { isFresh } from "./serp-cache";
import { resolveHunterSource, type HunterContact, type HunterSource } from "./hunter-connector";

/** Contacts are cached for 30 days. */
export const CONTACT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Resolve an outlet domain's contacts, using the cache when fresh and refreshing
 * (and persisting) live results when stale. Demo/unauthenticated mode skips the
 * cache. Only live, non-empty results are cached.
 */
export async function getContacts(
  domain: string,
  source: HunterSource = resolveHunterSource(),
  now = Date.now(),
): Promise<{ contacts: HunterContact[]; live: boolean }> {
  // No session → don't spend a paid Hunter credit uncached.
  const noLive = { contacts: [], live: false };
  if (!domain) return noLive;
  const session = await getCacheSession();
  if (!session) return noLive;
  try {
    const { db, userId } = session;

    const { data: row } = await db
      .from("contact_cache")
      .select("contacts,fetched_at")
      .eq("domain", domain)
      .maybeSingle();

    if (row && isFresh(row.fetched_at, now, CONTACT_TTL_MS)) {
      return { contacts: (row.contacts as HunterContact[]) ?? [], live: true };
    }

    const fresh = await source.findContacts(domain);
    if (fresh.live && fresh.contacts.length > 0) {
      await db.from("contact_cache").upsert(
        { user_id: userId, domain, contacts: fresh.contacts, fetched_at: new Date(now).toISOString() },
        { onConflict: "user_id,domain" },
      );
    }
    return fresh;
  } catch {
    return noLive;
  }
}
