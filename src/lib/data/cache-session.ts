/**
 * Shared session guard for the per-user lookup caches (SERP, contacts,
 * residence). Each cache needs the same thing before touching its table: a
 * configured Supabase + an authenticated user. Returning null (demo, anon, or
 * any error) signals the caller to skip the cache — and, for paid providers,
 * to skip the live call too. Never throws.
 */

import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

type ServerDb = NonNullable<Awaited<ReturnType<typeof getSupabaseServerClient>>>;

export interface CacheSession {
  db: ServerDb;
  userId: string;
}

/** The authenticated cache session, or null in demo / unauthenticated / error. */
export async function getCacheSession(): Promise<CacheSession | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const db = await getSupabaseServerClient();
    if (!db) return null;
    const { data: { user } } = await db.auth.getUser();
    if (!user) return null;
    return { db, userId: user.id };
  } catch {
    return null;
  }
}
