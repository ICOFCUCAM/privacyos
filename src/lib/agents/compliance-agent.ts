import { BaseAgent, type AgentContext, type AgentResult } from "./base-agent";
import { readiness } from "@/lib/compliance/posture";
import type { AgentKind } from "@/lib/types";

/**
 * Compliance Agent — continuously monitors the SOC 2 control posture for drift
 * and flags partial/planned controls that need attention. Powers the compliance
 * narrative enterprise procurement underwrites: controls tied to evidence, kept
 * current rather than audited once a year.
 */
export class ComplianceAgent extends BaseAgent {
  readonly kind: AgentKind = "compliance";
  readonly name = "Compliance Agent";
  readonly description =
    "Monitors SOC 2 control posture & SLA attainment; flags control drift and gaps for continuous compliance.";

  async run(ctx: AgentContext): Promise<AgentResult> {
    const result = this.empty();
    const posture = readiness();
    const gaps = posture.partial + posture.planned;

    if (gaps > 0 && posture.readiness < 100) {
      result.recommendations.push({
        id: this.rid("rec", ctx, 1),
        subjectId: ctx.subject.id,
        agent: this.kind,
        title: "Close outstanding compliance controls",
        rationale: `SOC 2 readiness is ${posture.readiness}% — ${posture.partial} partial and ${posture.planned} planned controls remain. Closing them strengthens audit posture and unblocks enterprise procurement.`,
        riskLevel: posture.readiness < 80 ? "high" : "medium",
        impact: 6,
        actionLabel: "Review controls",
      });
    }
    result.log.push(
      `Compliance: ${posture.readiness}% SOC 2 readiness, ${posture.implemented} implemented, ${gaps} open controls.`,
    );
    return result;
  }
}
