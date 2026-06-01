/**
 * Journalist-contact cache.
 *
 * A Hunter.io lookup costs a credit, and contacts change slowly, so per-domain
 * results are cached per user for 30 days. Live-aware: with no Supabase session
 * (or no Hunter key) it falls straight through to the source (a no-op). Never
 * throws — enrichment must not break the Media page.
 */

import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
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
  if (!domain) return { contacts: [], live: false };
  if (!isSupabaseConfigured()) return source.findContacts(domain);
  try {
    const db = await getSupabaseServerClient();
    if (!db) return source.findContacts(domain);
    const { data: { user } } = await db.auth.getUser();
    if (!user) return source.findContacts(domain);

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
        { user_id: user.id, domain, contacts: fresh.contacts, fetched_at: new Date(now).toISOString() },
        { onConflict: "user_id,domain" },
      );
    }
    return fresh;
  } catch {
    return source.findContacts(domain);
  }
}
