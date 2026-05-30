import { BaseAgent, type AgentContext, type AgentResult } from "./base-agent";
import type { AgentKind } from "@/lib/types";

/**
 * Executive Protection Agent — heightened protection for VIP subjects
 * (executives, politicians, celebrities, HNWIs). Focuses on doxxing, location
 * exposure, family exposure and physical-security signals, applying a stricter
 * risk threshold than consumer protection.
 */
export class ExecutiveAgent extends BaseAgent {
  readonly kind: AgentKind = "executive";
  readonly name = "Executive Protection Agent";
  readonly description =
    "VIP-grade protection: monitors doxxing, location/family exposure and personal threats at a stricter threshold.";

  async run(ctx: AgentContext): Promise<AgentResult> {
    const result = this.empty();
    if (ctx.subject.type !== "executive") {
      result.log.push("Subject is not VIP-tier; executive protection idle.");
      return result;
    }

    const physical = ctx.threats.filter(
      (t) =>
        !t.acknowledged &&
        ["doxxing", "location_exposure"].includes(t.kind),
    );
    const addressExposures = ctx.exposures.filter(
      (e) => e.category === "address" && e.status !== "removed",
    );

    if (physical.length + addressExposures.length > 0) {
      result.recommendations.push({
        id: this.rid("rec", ctx, 1),
        subjectId: ctx.subject.id,
        agent: this.kind,
        title: "Escalate physical-security exposure",
        rationale: `${physical.length} doxxing/location threats and ${addressExposures.length} live address exposures present a physical-security risk for a VIP subject. Recommend priority removal + close-protection briefing.`,
        riskLevel: "critical",
        impact: 22,
        actionLabel: "Escalate to protection team",
      });
    }
    result.log.push(`VIP sweep: ${physical.length} physical-security threats, ${addressExposures.length} address exposures.`);
    return result;
  }
}
