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

  try {
    const client = await getSupabaseServerClient();
    if (!client) return new DemoDataSource();

    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return new DemoDataSource();

    // Probe schema readiness. If the backend isn't migrated yet (tables missing)
    // or is unreachable, degrade to demo data instead of crashing every page
    // with a 500. A real, migrated backend with an empty table returns no error.
    const { error } = await client.from("subjects").select("id").limit(1);
    if (error) {
      console.error("[privacyos] live backend not ready — using demo data:", error.message);
      return new DemoDataSource();
    }

    return new SupabaseDataSource(client);
  } catch (err) {
    console.error("[privacyos] data source resolution failed — using demo data:", err);
    return new DemoDataSource();
  }
}
