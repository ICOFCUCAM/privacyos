/**
 * Residence property-data cache.
 *
 * A property-data lookup costs a credit and property facts change slowly, so
 * per-address results are cached per user for 30 days. Credit-safe: with no
 * Supabase session (or no provider key) it returns no signals rather than
 * spending a credit uncached. Never throws — the Residence tab must not break.
 */

import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { isFresh } from "@/lib/reputation/os/serp-cache";
import { resolveResidenceSource, type ResidenceSignals, type ResidenceSource } from "./residence-connector";

/** Property facts are cached for 30 days. */
export const RESIDENCE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export async function getResidenceSignals(
  address: string,
  source: ResidenceSource = resolveResidenceSource(),
  now = Date.now(),
): Promise<{ signals: ResidenceSignals | null; live: boolean }> {
  const noLive = { signals: null, live: false };
  if (!address || !isSupabaseConfigured()) return noLive;
  try {
    const db = await getSupabaseServerClient();
    if (!db) return noLive;
    const { data: { user } } = await db.auth.getUser();
    if (!user) return noLive;

    const { data: row } = await db
      .from("residence_cache")
      .select("signals,fetched_at")
      .eq("address", address)
      .maybeSingle();

    if (row && isFresh(row.fetched_at, now, RESIDENCE_TTL_MS)) {
      return { signals: (row.signals as ResidenceSignals | null) ?? null, live: true };
    }

    const fresh = await source.lookup(address);
    if (fresh.live) {
      await db.from("residence_cache").upsert(
        { user_id: user.id, address, signals: fresh.signals, fetched_at: new Date(now).toISOString() },
        { onConflict: "user_id,address" },
      );
    }
    return fresh;
  } catch {
    return noLive;
  }
}
