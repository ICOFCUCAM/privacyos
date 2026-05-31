import { BaseAgent, type AgentContext, type AgentResult } from "./base-agent";
import { readiness } from "@/lib/compliance/posture";
import { allFrameworkCoverage, runComplianceCycle } from "@/lib/compliance/frameworks";
import type { AgentKind } from "@/lib/types";

/**
 * Compliance Agent — the BusinessOS compliance engine. Each cycle it executes
 * continuous-monitoring tasks across every framework PrivacyOS supports — GDPR,
 * CCPA, SOC 2, ISO 27001, HIPAA and PCI-DSS — scoring per-framework coverage,
 * detecting control drift, and flagging the requirements still open. This is
 * the "controls tied to evidence, kept current" narrative enterprise
 * procurement underwrites, rather than a once-a-year audit.
 */
export class ComplianceAgent extends BaseAgent {
  readonly kind: AgentKind = "compliance";
  readonly name = "Compliance Agent";
  readonly description =
    "Executes GDPR, CCPA, SOC 2 & ISO 27001 monitoring; scores framework coverage and flags control drift.";

  async run(ctx: AgentContext): Promise<AgentResult> {
    const result = this.empty();
    const posture = readiness();
    const cycle = runComplianceCycle();
    const coverage = allFrameworkCoverage();
    const atRisk = coverage.filter((c) => c.standing !== "Compliant");

    if (atRisk.length > 0) {
      const names = atRisk.map((c) => `${c.name} (${c.coverage}%)`).join(", ");
      result.recommendations.push({
        id: this.rid("rec", ctx, 1),
        subjectId: ctx.subject.id,
        agent: this.kind,
        title: "Close outstanding compliance requirements",
        rationale: `Blended framework coverage is ${cycle.overallCoverage}% with ${cycle.openItems} open items. Frameworks needing attention: ${names}. Closing these strengthens audit posture and unblocks enterprise procurement.`,
        riskLevel: cycle.overallCoverage < 80 ? "high" : "medium",
        impact: 6,
        actionLabel: "Review frameworks",
      });
    }
    result.log.push(
      `Compliance: ran ${cycle.tasksRun} monitoring tasks across ${cycle.frameworksMonitored} frameworks (GDPR/CCPA/SOC 2/ISO 27001/HIPAA/PCI-DSS) — ${cycle.overallCoverage}% blended coverage, ${posture.readiness}% SOC 2 readiness, ${cycle.openItems} open items.`,
    );
    return result;
  }
}
