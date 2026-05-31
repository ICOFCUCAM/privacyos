import { BaseAgent, type AgentContext, type AgentResult } from "./base-agent";
import type { AgentKind } from "@/lib/types";

/**
 * Vendor / Third-Party Risk Agent — continuously assesses the supply chain:
 * vendors and partners with access to the organization's data and brand, plus
 * domain-level impersonation that rides third-party infrastructure. A distinct
 * enterprise buying motion from internal (Business) protection.
 */
export class VendorAgent extends BaseAgent {
  readonly kind: AgentKind = "vendor";
  readonly name = "Vendor Risk Agent";
  readonly description =
    "Assesses third-party & supply-chain risk: vendors with data access and domain-level impersonation.";

  async run(ctx: AgentContext): Promise<AgentResult> {
    const result = this.empty();
    if (ctx.subject.type !== "business") {
      result.log.push("Subject is not an organization; vendor risk idle.");
      return result;
    }

    // Third-party signals surface as impersonation/phishing threats and
    // externally-sourced exposures tied to partner infrastructure.
    const supplyChainThreats = ctx.threats.filter(
      (t) => (t.kind === "impersonation" || t.kind === "negative_press") && !t.acknowledged,
    );
    const externalExposures = ctx.exposures.filter(
      (e) => e.source === "public_record" || e.source === "news",
    );

    if (supplyChainThreats.length > 0) {
      result.recommendations.push({
        id: this.rid("rec", ctx, 1),
        subjectId: ctx.subject.id,
        agent: this.kind,
        title: "Assess elevated third-party risk",
        rationale: `${supplyChainThreats.length} supply-chain signals detected (impersonation/brand abuse via partner or vendor infrastructure). Re-score affected vendors and request attestations.`,
        riskLevel: "high",
        impact: 7,
        actionLabel: "Review vendors",
      });
    }
    result.log.push(
      `Vendor sweep: ${supplyChainThreats.length} supply-chain signals, ${externalExposures.length} externally-sourced exposures.`,
    );
    return result;
  }
}
