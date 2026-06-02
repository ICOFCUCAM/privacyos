import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { runScheduledCycle } from "@/lib/scheduler/run";
import { SupabaseSchedulerStore } from "@/lib/scheduler/supabase-store";
import { resolveProvider } from "@/lib/agents/llm/provider";

/**
 * The scheduled protection cycle endpoint (always-on monitoring).
 *
 * Triggered by a scheduler — Supabase pg_cron / Edge Function, Vercel Cron, or
 * GitHub Actions. Guarded by CRON_SECRET: callers must send
 * `Authorization: Bearer <CRON_SECRET>` (Vercel Cron sets this automatically).
 * Runs across all tenants using the service-role client.
 *
 * GET and POST behave identically (Vercel Cron uses GET).
 */
async function handle(req: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  // Fail closed: this endpoint runs the scheduler with the service-role client
  // across every tenant, so it must never be callable without a configured
  // secret. No secret = locked, not open.
  if (!secret) {
    return NextResponse.json(
      { error: "Scheduler disabled (CRON_SECRET not configured)." },
      { status: 503 },
    );
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Scheduler not configured (missing SUPABASE_SERVICE_ROLE_KEY)." },
      { status: 503 },
    );
  }

  const summary = await runScheduledCycle(new SupabaseSchedulerStore(admin), {
    provider: resolveProvider(),
  });
  return NextResponse.json({ ok: true, ...summary });
}

export async function POST(req: Request) {
  return handle(req);
}

export async function GET(req: Request) {
  return handle(req);
}
