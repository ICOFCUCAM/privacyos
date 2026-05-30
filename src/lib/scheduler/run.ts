/**
 * The always-on protection cycle.
 *
 * For every subject across all tenants: run the discovery pipeline, persist new
 * findings, run the full agent orchestrator over the combined footprint,
 * refresh recommendations, record an audit run + activity + score snapshots, and
 * raise notifications for new critical threats. This is the engine behind 24/7
 * monitoring — invoked on a schedule via /api/cron (pg_cron / Edge Function /
 * Vercel Cron). It reuses the exact same orchestrator, discovery and scoring
 * used interactively, so scheduled and on-demand runs never drift.
 */

import { protect } from "@/lib/agents/orchestrator";
import type { LLMProvider } from "@/lib/agents/llm/provider";
import { runDiscovery } from "@/lib/discovery/pipeline";
import type { DiscoverySource } from "@/lib/discovery/source";
import { computeRiskScore } from "@/lib/scoring/risk-score";
import type {
  NewAgentAction,
  NewNotification,
  ScheduledRunSummary,
  SchedulerStore,
} from "./store";

export interface SchedulerDeps {
  /** Override discovery sources (tests inject deterministic ones). */
  sources?: DiscoverySource[];
  /** Override the LLM provider (defaults to env-resolved / mock). */
  provider?: LLMProvider;
}

export async function runScheduledCycle(
  store: SchedulerStore,
  deps: SchedulerDeps = {},
): Promise<ScheduledRunSummary> {
  const footprints = await store.listFootprints();
  let newExposures = 0;
  let newThreats = 0;
  let recommendations = 0;

  for (const fp of footprints) {
    // 1. Discover — only genuinely new findings come back (deduped).
    const finding = await runDiscovery(
      { subject: fp.subject, existing: fp.exposures },
      deps.sources,
    );
    if (finding.exposures.length || finding.threats.length) {
      await store.saveDiscovered(fp.userId, finding.exposures, finding.threats);
    }

    const exposures = [...fp.exposures, ...finding.exposures];
    const threats = [...fp.threats, ...finding.threats];

    // 2. Orchestrate the agent fleet over the refreshed footprint.
    const outcome = await protect({
      subject: fp.subject,
      exposures,
      threats,
      provider: deps.provider,
    });

    // 3. Refresh recommendations (replace prior un-approved ones).
    await store.replaceRecommendations(fp.userId, fp.subject.id, outcome.recommendations);

    // 4. Audit run + activity feed.
    await store.recordRun(fp.userId, outcome);
    const actions: NewAgentAction[] = [
      {
        agent: "discovery",
        kind: "scan",
        summary: `Discovery swept all layers: ${finding.exposures.length} new exposure(s), ${finding.threats.length} new threat(s).`,
        status: "completed",
      },
      ...outcome.agentStates
        .filter((a) => a.itemsHandled > 0)
        .map<NewAgentAction>((a) => ({
          agent: a.kind,
          kind: "analyze",
          summary: `${a.name} produced ${a.itemsHandled} item(s).`,
          status: "completed",
        })),
    ];
    await store.recordActions(fp.userId, fp.subject.id, actions);

    // 5. Score snapshots for trend charts.
    const risk = computeRiskScore(exposures, threats);
    await store.recordScores(fp.userId, fp.subject.id, [
      { kind: "privacy", value: risk.overall },
      { kind: "identity", value: risk.identity },
      { kind: "overall", value: risk.overall },
    ]);

    // 6. Notify on new critical threats.
    const critical = finding.threats.filter((t) => t.riskLevel === "critical");
    if (critical.length > 0) {
      const notifs: NewNotification[] = critical.map((t) => ({
        kind: "incident",
        title: `New critical threat: ${t.title}`,
        body: t.detail,
        riskLevel: "critical",
      }));
      await store.addNotifications(fp.userId, notifs);
    }

    newExposures += finding.exposures.length;
    newThreats += finding.threats.length;
    recommendations += outcome.recommendations.length;
  }

  return {
    subjectsProcessed: footprints.length,
    newExposures,
    newThreats,
    recommendations,
    ranAt: new Date().toISOString(),
  };
}
