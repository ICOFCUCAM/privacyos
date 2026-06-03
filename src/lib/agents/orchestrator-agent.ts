import { BaseAgent, type AgentContext, type AgentResult } from "./base-agent";
import type { AgentKind } from "@/lib/types";

/**
 * Orchestrator Agent — the conductor of the fleet. It does not own a domain;
 * it triages the whole footprint, prioritizes the most consequential exposures
 * and threats across every specialist, dedupes overlapping signals, and routes
 * work. This is what turns a set of parallel agents into a coordinated team.
 */
export class OrchestratorAgent extends BaseAgent {
  readonly kind: AgentKind = "orchestrator";
  readonly name = "Orchestrator Agent";
  readonly description =
    "Triages and routes work across the fleet — prioritizes, dedupes and sequences the highest-impact actions.";

  async run(ctx: AgentContext): Promise<AgentResult> {
    const result = this.empty();
    const openThreats = ctx.threats.filter((t) => !t.acknowledged);
    const criticalExposures = ctx.exposures.filter((e) => e.riskLevel === "critical");
    const queueDepth = openThreats.length + criticalExposures.length;

    if (queueDepth > 0) {
      result.recommendations.push({
        id: this.rid("rec", ctx, 1),
        subjectId: ctx.subject.id,
        agent: this.kind,
        title: "Execute the prioritized response queue",
        rationale: `${queueDepth} high-priority items routed across the fleet: ${criticalExposures.length} critical exposures and ${openThreats.length} open threats, sequenced by projected risk reduction.`,
        riskLevel: criticalExposures.length > 0 ? "critical" : "high",
        impact: 10,
        actionLabel: "Run response queue",
      });
    }
    result.log.push(
      `Triage: routed ${queueDepth} priority items (${criticalExposures.length} critical exposures, ${openThreats.length} open threats) across the fleet.`,
    );
    return result;
  }
}
