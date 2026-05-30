import { BaseAgent, type AgentContext, type AgentResult } from "./base-agent";
import type { AgentKind } from "@/lib/types";

/**
 * Discovery Agent — finds exposures across search engines, brokers, social
 * networks, forums, archives and breach databases. In this scaffold it
 * synthesizes representative findings; in production each source is a connector
 * implementing a common `DiscoverySource` interface (search API, broker crawler,
 * breach feed, etc.).
 */
export class DiscoveryAgent extends BaseAgent {
  readonly kind: AgentKind = "discovery";
  readonly name = "Discovery Agent";
  readonly description =
    "Continuously scans the public internet, data brokers, and breach feeds to build the exposure inventory.";

  async run(ctx: AgentContext): Promise<AgentResult> {
    const result = this.empty();
    // Recommend a deeper sweep when the known footprint is thin relative to the
    // number of identifiers we monitor — a real signal that coverage is low.
    const identifiers =
      ctx.subject.emails.length + ctx.subject.phones.length + ctx.subject.usernames.length;
    if (ctx.exposures.length < identifiers * 2) {
      result.recommendations.push({
        id: this.rid("rec", ctx, 1),
        subjectId: ctx.subject.id,
        agent: this.kind,
        title: "Run a deep discovery sweep",
        rationale: `Only ${ctx.exposures.length} exposures are known for ${identifiers} monitored identifiers. A deep sweep across brokers, archives and social platforms will close coverage gaps.`,
        riskLevel: "medium",
        impact: 6,
        actionLabel: "Start deep sweep",
      });
    }
    result.log.push(
      `Scanned footprint for ${ctx.subject.displayName}: ${ctx.exposures.length} known exposures across ${new Set(ctx.exposures.map((e) => e.source)).size} source types.`,
    );
    return result;
  }
}
