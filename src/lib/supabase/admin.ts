/**
 * Service-role Supabase client for trusted server-side jobs (the scheduler).
 *
 * Bypasses RLS, so it must only ever be used in server contexts that are
 * themselves access-controlled (the CRON_SECRET-guarded /api/cron route). Never
 * import this into client components. Returns null when unconfigured.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function getSupabaseAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
