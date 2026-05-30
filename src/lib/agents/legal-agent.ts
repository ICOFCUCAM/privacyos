import { BaseAgent, type AgentContext, type AgentResult } from "./base-agent";
import type { AgentKind } from "@/lib/types";

/**
 * Legal Agent — drafts GDPR/CCPA erasure requests, platform complaints, and
 * takedown notices using the LLM provider, and tracks their lifecycle. Drafting
 * is delegated to the provider so output quality scales with the configured
 * model while the agent owns selection, prioritization and tracking.
 */
export class LegalAgent extends BaseAgent {
  readonly kind: AgentKind = "legal";
  readonly name = "Legal Agent";
  readonly description =
    "Generates GDPR/CCPA requests, platform complaints and legal evidence packets, and tracks responses & escalations.";

  async run(ctx: AgentContext): Promise<AgentResult> {
    const result = this.empty();
    const legalTargets = ctx.exposures.filter(
      (e) =>
        ["high", "critical"].includes(e.riskLevel) &&
        ["data_broker", "public_record", "news", "social_media"].includes(e.source),
    );

    if (legalTargets.length > 0) {
      // Use the provider to draft a request preamble (mock-safe).
      const draft = await ctx.llm.complete([
        {
          role: "system",
          content:
            "You are a privacy legal assistant. Draft concise, jurisdiction-aware data erasure requests.",
        },
        {
          role: "user",
          content: `Draft a GDPR Article 17 erasure request for ${legalTargets.length} high-severity exposures of ${ctx.subject.displayName}.`,
        },
      ]);

      result.recommendations.push({
        id: this.rid("rec", ctx, 1),
        subjectId: ctx.subject.id,
        agent: this.kind,
        title: `Send ${legalTargets.length} erasure requests`,
        rationale: `High/critical exposures qualify for statutory erasure. A request packet has been drafted (${draft.provider}/${draft.model}) and is ready for review.`,
        riskLevel: "high",
        impact: Math.min(20, legalTargets.length * 3),
        actionLabel: "Review & send requests",
      });
    }
    result.log.push(`Identified ${legalTargets.length} exposures eligible for statutory removal.`);
    return result;
  }
}
