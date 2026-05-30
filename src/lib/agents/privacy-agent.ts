import { BaseAgent, type AgentContext, type AgentResult } from "./base-agent";
import type { AgentKind } from "@/lib/types";

/**
 * Privacy Agent — owns data-broker removals. It triages discovered broker
 * exposures, prioritizes by risk, and proposes opt-out actions. The actual
 * opt-out submission and recurring re-checks are handled by the workflow engine
 * (see `supabase` schema: removal_requests).
 */
export class PrivacyAgent extends BaseAgent {
  readonly kind: AgentKind = "privacy";
  readonly name = "Privacy Agent";
  readonly description =
    "Discovers broker profiles, files opt-out requests, tracks status, and schedules recurring re-checks.";

  async run(ctx: AgentContext): Promise<AgentResult> {
    const result = this.empty();
    const removable = ctx.exposures
      .filter((e) => e.source === "data_broker" && ["discovered", "triaged", "reappeared"].includes(e.status))
      .sort((a, b) => b.riskScore - a.riskScore);

    for (const [i, e] of removable.slice(0, 10).entries()) {
      result.recommendations.push({
        id: this.rid("rec", ctx, i + 1),
        subjectId: ctx.subject.id,
        agent: this.kind,
        title: `File opt-out at ${e.sourceName}`,
        rationale: `${e.category} exposure on ${e.sourceName} rated ${e.riskLevel}. Automated opt-out + 30/60/90-day re-checks will remove it and detect reappearance.`,
        riskLevel: e.riskLevel,
        impact: Math.round(e.riskScore / 4),
        actionLabel: "Generate opt-out",
      });
    }
    result.log.push(`Queued ${Math.min(removable.length, 10)} broker opt-outs (of ${removable.length} eligible).`);
    return result;
  }
}
