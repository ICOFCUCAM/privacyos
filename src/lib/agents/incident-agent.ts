import { BaseAgent, type AgentContext, type AgentResult } from "./base-agent";
import { exposureToFinding, runPlaybooks, summarizeRuns, threatToFinding } from "./playbooks";
import type { AgentKind } from "@/lib/types";

/**
 * Incident Response Agent — owns the autonomous response playbooks end to end.
 * It matches live findings to playbooks, executes the steps that are safe to
 * automate, and surfaces the irreversible/high-risk steps that need human
 * sign-off. This is the agent that operates the automation moat.
 */
export class IncidentAgent extends BaseAgent {
  readonly kind: AgentKind = "incident";
  readonly name = "Incident Response Agent";
  readonly description =
    "Runs detect→decide→act→escalate playbooks against live findings; automates safe steps, escalates the rest.";

  async run(ctx: AgentContext): Promise<AgentResult> {
    const result = this.empty();
    const runs = runPlaybooks([
      ...ctx.exposures.map(exposureToFinding),
      ...ctx.threats.map(threatToFinding),
    ]);
    const summary = summarizeRuns(runs);

    if (summary.approvalSteps > 0) {
      result.recommendations.push({
        id: this.rid("rec", ctx, 1),
        subjectId: ctx.subject.id,
        agent: this.kind,
        title: "Approve pending response actions",
        rationale: `${summary.totalRuns} playbook runs executed (${summary.automationRate}% of steps autonomously). ${summary.approvalSteps} irreversible/high-risk steps are staged and awaiting your sign-off.`,
        riskLevel: "high",
        impact: 9,
        actionLabel: "Review & approve",
      });
    }
    result.log.push(
      `Playbooks: ${summary.totalRuns} runs, ${summary.autonomousRuns} fully autonomous, ${summary.automationRate}% steps automated, ${summary.approvalSteps} awaiting approval.`,
    );
    return result;
  }
}
