import { BaseAgent, type AgentContext, type AgentResult } from "./base-agent";
import type { AgentKind } from "@/lib/types";

/**
 * Reputation Agent — the brain of ReputationOS. Monitors search, news, blogs,
 * forums, Reddit, social, video and review sites; scores sentiment, authority,
 * reach, influence and brand perception; and drives growth (content, SEO,
 * social), earned media, recovery (suppression, repair, crisis comms) and
 * opportunity intelligence — auto-generating campaigns, PR and recovery plans.
 */
export class ReputationAgent extends BaseAgent {
  readonly kind: AgentKind = "reputation";
  readonly name = "Reputation Agent";
  readonly description =
    "Runs ReputationOS: 24/7 monitoring + sentiment/authority/reach/influence/brand scoring across the web, plus growth, SEO, earned media, recovery and opportunity intelligence with auto-generated campaigns.";

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
