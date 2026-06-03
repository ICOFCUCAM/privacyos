/**
 * LLM advisor.
 *
 * Turns the synthesized recommendation plan + footprint context into an
 * executive narrative: a one-line situation summary and a short "why this order"
 * rationale for the top actions. Uses the injected LLM provider when a real one
 * is configured (Anthropic/OpenAI), and falls back to a deterministic,
 * template-built narrative when the provider is the mock or the call fails — so
 * it always returns something useful, with zero keys required.
 *
 * The seam is provider-agnostic and unit-tested against MockProvider.
 */

import type { LLMProvider } from "./llm/provider";
import type { SynthesizedRecommendation } from "./synthesis";
import type { RiskLevel } from "@/lib/types";

export interface AdvisorContext {
  subjectName: string;
  exposureScore: number;
  threatLevel: RiskLevel;
  activeThreats: number;
}

export interface AdvisorOutput {
  /** One-sentence situation summary. */
  summary: string;
  /** Short rationale for the recommended action order. */
  rationale: string;
  /** Whether this came from a real LLM or the deterministic fallback. */
  source: "llm" | "fallback";
  provider: string;
}

const SYSTEM = `You are the lead analyst of an autonomous digital-risk operations
platform. Given the current posture and the prioritized action plan, respond
with STRICT JSON: {"summary": string, "rationale": string}. The summary is one
sentence on the situation. The rationale is 1-2 sentences on why the action
order is correct. No prose outside the JSON.`;

function buildPrompt(ctx: AdvisorContext, plan: SynthesizedRecommendation[]): string {
  const top = plan.slice(0, 5).map((r, i) =>
    `${i + 1}. ${r.title} — ${r.riskLevel} risk, −${r.impact} pts, ${Math.round(r.confidence * 100)}% confidence` +
    (r.corroboratingAgents.length > 1 ? ` (${r.corroboratingAgents.length} agents agree)` : ""),
  ).join("\n");
  return `Subject: ${ctx.subjectName}
Exposure score: ${ctx.exposureScore}/100 (threat level ${ctx.threatLevel})
Active threats: ${ctx.activeThreats}
Prioritized plan:
${top || "(no open actions)"}`;
}

/** Deterministic narrative when no real LLM is available. */
export function fallbackNarrative(ctx: AdvisorContext, plan: SynthesizedRecommendation[]): AdvisorOutput {
  const top = plan[0];
  const corroborated = plan.filter((r) => r.corroboratingAgents.length > 1).length;
  const summary = plan.length === 0
    ? `${ctx.subjectName} has no open actions — exposure ${ctx.exposureScore}/100 with ${ctx.activeThreats} active threat${ctx.activeThreats === 1 ? "" : "s"} under watch.`
    : `${ctx.subjectName} faces ${ctx.threatLevel} exposure (${ctx.exposureScore}/100); ${plan.length} prioritized action${plan.length === 1 ? "" : "s"} pending, led by "${top.title}".`;
  const rationale = plan.length === 0
    ? "The fleet is in monitoring mode; no action requires your approval right now."
    : `Actions are ordered by impact × confidence × risk, so "${top.title}" (${top.riskLevel}, −${top.impact} pts) leads.` +
      (corroborated > 0 ? ` ${corroborated} item${corroborated === 1 ? " is" : "s are"} corroborated by multiple agents, raising confidence.` : "");
  return { summary, rationale, source: "fallback", provider: "deterministic" };
}

function tryParseJson(text: string): { summary?: string; rationale?: string } | null {
  // Tolerate code fences / surrounding prose by extracting the first {...} block.
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

/**
 * Produce the advisor narrative. Calls the provider; if it's the mock, errors,
 * or returns unparseable output, returns the deterministic fallback.
 */
export async function adviseOnPlan(
  provider: LLMProvider,
  ctx: AdvisorContext,
  plan: SynthesizedRecommendation[],
): Promise<AdvisorOutput> {
  if (provider.name === "mock") return fallbackNarrative(ctx, plan);
  try {
    const res = await provider.complete(
      [
        { role: "system", content: SYSTEM },
        { role: "user", content: buildPrompt(ctx, plan) },
      ],
      { json: true },
    );
    const parsed = tryParseJson(res.text);
    if (!parsed?.summary || !parsed?.rationale) return fallbackNarrative(ctx, plan);
    return {
      summary: String(parsed.summary),
      rationale: String(parsed.rationale),
      source: "llm",
      provider: res.provider,
    };
  } catch {
    return fallbackNarrative(ctx, plan);
  }
}
