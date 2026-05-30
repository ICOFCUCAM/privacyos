/**
 * Data-source resolver.
 *
 * Returns the live Supabase source only when the platform is configured AND a
 * user is signed in; otherwise the deterministic demo source. This keeps the
 * product fully explorable before auth/backed by graceful degradation, while
 * automatically going live once a session exists.
 */

import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { DataSource } from "./source";
import { DemoDataSource } from "./demo-source";
import { SupabaseDataSource } from "./supabase-source";

export type { DataSource, PrivacyDataSet } from "./source";

export async function getDataSource(): Promise<DataSource> {
  if (!isSupabaseConfigured()) return new DemoDataSource();

  const client = await getSupabaseServerClient();
  if (!client) return new DemoDataSource();

  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return new DemoDataSource();

  return new SupabaseDataSource(client);
}
