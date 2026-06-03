import { BaseAgent, type AgentContext, type AgentResult } from "./base-agent";
import { buildCorrelationGraph, correlationStats } from "@/lib/intelligence/correlation";
import type { AgentKind } from "@/lib/types";

/**
 * Threat Intelligence Agent — correlates signals across sources and data
 * categories into emerging-threat narratives. Rather than reacting to single
 * findings, it identifies where exposure concentrates and which links are most
 * dangerous, feeding the threat-correlation view.
 */
export class ThreatIntelAgent extends BaseAgent {
  readonly kind: AgentKind = "threat_intel";
  readonly name = "Threat Intelligence Agent";
  readonly description =
    "Correlates exposures, sources and threats into emerging-threat narratives and concentration hotspots.";

  async run(ctx: AgentContext): Promise<AgentResult> {
    const result = this.empty();
    const graph = buildCorrelationGraph(ctx.subject.displayName, ctx.exposures, ctx.threats);
    const stats = correlationStats(graph);

    if (stats.criticalLinks > 0 && stats.topSource) {
      result.recommendations.push({
        id: this.rid("rec", ctx, 1),
        subjectId: ctx.subject.id,
        agent: this.kind,
        title: `Prioritize ${stats.topSource.label} — primary exposure vector`,
        rationale: `Correlation across ${stats.sources} sources and ${stats.categories} data categories shows ${stats.criticalLinks} high-risk links. "${stats.topSource.label}" carries the most exposure (${stats.topSource.weight} items); collapsing it cuts the broadest risk.`,
        riskLevel: "high",
        impact: 8,
        actionLabel: "View correlation",
      });
    }
    result.log.push(
      `Correlation: ${stats.sources} sources, ${stats.categories} categories, ${stats.criticalLinks} high-risk links${stats.topSource ? `, top vector ${stats.topSource.label}` : ""}.`,
    );
    return result;
  }
}
