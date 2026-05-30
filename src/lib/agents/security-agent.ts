import { BaseAgent, type AgentContext, type AgentResult } from "./base-agent";
import type { AgentKind } from "@/lib/types";

/**
 * Security Agent — watches breach databases and dark-web sources for credential
 * leaks and identity-theft indicators, classifies severity, and drives breach
 * response (password rotation, monitoring, recovery guidance).
 */
export class SecurityAgent extends BaseAgent {
  readonly kind: AgentKind = "security";
  readonly name = "Security Agent";
  readonly description =
    "Monitors breach & dark-web sources for credential and identity leaks; drives breach response and recovery.";

  async run(ctx: AgentContext): Promise<AgentResult> {
    const result = this.empty();
    const leaks = ctx.exposures.filter(
      (e) => e.category === "credential" || e.source === "dark_web" || e.source === "breach_db",
    );
    const critical = leaks.filter((e) => e.riskLevel === "critical");

    if (critical.length > 0) {
      result.recommendations.push({
        id: this.rid("rec", ctx, 1),
        subjectId: ctx.subject.id,
        agent: this.kind,
        title: "Rotate exposed credentials now",
        rationale: `${critical.length} critical credential leaks detected on breach/dark-web sources. Immediate rotation and MFA enforcement contain account-takeover risk.`,
        riskLevel: "critical",
        impact: 18,
        actionLabel: "Start breach response",
      });
    }
    result.log.push(`Breach sweep: ${leaks.length} leak indicators, ${critical.length} critical.`);
    return result;
  }
}
