import { BaseAgent, type AgentContext, type AgentResult } from "./base-agent";
import type { AgentKind } from "@/lib/types";

/**
 * Business Intelligence Agent — protects organizations: employee credential
 * leaks, exposed assets, leaked documents, domain risks and brand
 * impersonation. Aggregates per-employee exposure into org-level risk.
 */
export class BusinessAgent extends BaseAgent {
  readonly kind: AgentKind = "business";
  readonly name = "Business Intelligence Agent";
  readonly description =
    "Org-level protection: employee credential leaks, exposed assets, leaked documents and brand impersonation.";

  async run(ctx: AgentContext): Promise<AgentResult> {
    const result = this.empty();
    if (ctx.subject.type !== "business") {
      result.log.push("Subject is not an organization; business intelligence idle.");
      return result;
    }

    const credentialLeaks = ctx.exposures.filter((e) => e.category === "credential");
    const impersonation = ctx.threats.filter((t) => t.kind === "impersonation" && !t.acknowledged);

    if (credentialLeaks.length > 0) {
      result.recommendations.push({
        id: this.rid("rec", ctx, 1),
        subjectId: ctx.subject.id,
        agent: this.kind,
        title: "Contain employee credential exposure",
        rationale: `${credentialLeaks.length} employee credential leaks tied to ${ctx.subject.organization ?? "the organization"}. Force resets, notify affected staff, and check for lateral reuse.`,
        riskLevel: "critical",
        impact: 20,
        actionLabel: "Open breach response",
      });
    }
    if (impersonation.length > 0) {
      result.recommendations.push({
        id: this.rid("rec", ctx, 2),
        subjectId: ctx.subject.id,
        agent: this.kind,
        title: "Take down impersonating assets",
        rationale: `${impersonation.length} brand-impersonation signals (fake sites/profiles) detected. Evidence packages are ready for registrar and platform takedowns.`,
        riskLevel: "high",
        impact: 12,
        actionLabel: "Start takedowns",
      });
    }
    result.log.push(`Org sweep: ${credentialLeaks.length} credential leaks, ${impersonation.length} impersonation signals.`);
    return result;
  }
}
