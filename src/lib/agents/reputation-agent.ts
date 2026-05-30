import { BaseAgent, type AgentContext, type AgentResult } from "./base-agent";
import type { AgentKind } from "@/lib/types";

/**
 * Reputation Agent — monitors search rankings, news, reviews and forums,
 * scores sentiment, and proposes suppression/recovery strategies for harmful
 * content.
 */
export class ReputationAgent extends BaseAgent {
  readonly kind: AgentKind = "reputation";
  readonly name = "Reputation Agent";
  readonly description =
    "Monitors search visibility, news and sentiment; designs SEO suppression and reputation-recovery plans.";

  async run(ctx: AgentContext): Promise<AgentResult> {
    const result = this.empty();
    const harmful = ctx.exposures.filter(
      (e) => e.source === "news" && ["high", "critical"].includes(e.riskLevel),
    );
    const negativeThreats = ctx.threats.filter((t) => t.kind === "negative_press" && !t.acknowledged);

    if (harmful.length + negativeThreats.length > 0) {
      result.recommendations.push({
        id: this.rid("rec", ctx, 1),
        subjectId: ctx.subject.id,
        agent: this.kind,
        title: "Launch reputation recovery plan",
        rationale: `${harmful.length} harmful articles and ${negativeThreats.length} active negative-press signals are suppressing reputation. A content + SEO recovery plan can displace them in search results.`,
        riskLevel: "high",
        impact: 12,
        actionLabel: "Build recovery plan",
      });
    }
    result.log.push(`Sentiment sweep: ${harmful.length} harmful items, ${negativeThreats.length} live negative signals.`);
    return result;
  }
}
