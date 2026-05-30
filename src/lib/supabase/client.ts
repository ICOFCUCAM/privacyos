"use client";

/**
 * Browser-side Supabase client for client components (auth forms, realtime).
 * Throws if called when env is unconfigured — callers should gate on
 * `NEXT_PUBLIC_SUPABASE_URL` being present.
 */
import { createBrowserClient } from "@supabase/ssr";

export function getSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase is not configured (missing NEXT_PUBLIC_SUPABASE_* env).");
  }
  return createBrowserClient(url, key);
}
