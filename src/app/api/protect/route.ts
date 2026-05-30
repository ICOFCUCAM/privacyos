import { NextResponse } from "next/server";
import { protect } from "@/lib/agents/orchestrator";
import { getDataSource } from "@/lib/data";

/**
 * POST /api/protect — runs the full agent orchestration cycle for the current
 * user's primary subject.
 *
 * Reads the subject + footprint from the active data source (live Supabase when
 * signed in, otherwise the demo dataset), runs all agents, and — when live —
 * persists the run to `agent_runs` and the resulting recommendations. The LLM
 * provider is auto-resolved from env (deterministic mock by default).
 *
 * Body (optional): { only?: AgentKind[] }.
 */
export async function POST(req: Request) {
  let only: string[] | undefined;
  try {
    const body = await req.json();
    only = Array.isArray(body?.only) ? body.only : undefined;
  } catch {
    // No body — run all agents.
  }

  const ds = await getDataSource();
  const data = await ds.getDataset();

  const outcome = await protect({
    subject: data.subject,
    exposures: data.exposures,
    threats: data.threats,
    only: only as never,
  });

  if (ds.live) {
    await ds.persistProtectRun(outcome);
  }

  return NextResponse.json({ persisted: ds.live, ...outcome });
}

export async function GET() {
  return NextResponse.json({
    service: "PrivacyOS agent orchestrator",
    usage: "POST /api/protect with optional { only: AgentKind[] }",
  });
}
