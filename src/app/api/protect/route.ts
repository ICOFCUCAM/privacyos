import { NextResponse } from "next/server";
import { protect } from "@/lib/agents/orchestrator";
import {
  demoExposures,
  demoSubject,
  demoThreats,
} from "@/lib/data/demo";

/**
 * POST /api/protect — runs the full agent orchestration cycle for a subject.
 *
 * Body (all optional): { only?: AgentKind[] }. With no Supabase configured this
 * runs against the demo subject so the flagship "Protect me" flow is callable
 * out of the box. The LLM provider is auto-resolved from env (mock by default).
 */
export async function POST(req: Request) {
  let only: string[] | undefined;
  try {
    const body = await req.json();
    only = Array.isArray(body?.only) ? body.only : undefined;
  } catch {
    // No body — run all agents.
  }

  const outcome = await protect({
    subject: demoSubject,
    exposures: demoExposures,
    threats: demoThreats,
    only: only as never,
  });

  return NextResponse.json(outcome);
}

export async function GET() {
  return NextResponse.json({
    service: "PrivacyOS agent orchestrator",
    usage: "POST /api/protect with optional { only: AgentKind[] }",
  });
}
