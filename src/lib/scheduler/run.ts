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
import { advanceRemoval, shouldReappear } from "@/lib/brokers/removal";
import { planAutoFilings } from "@/lib/brokers/auto-file";
import { casesForNewThreats } from "@/lib/agents/threat-cases";
import { investigationTimeline } from "@/lib/intelligence/threat-intel";
import { collectReputation, type MentionSource } from "@/lib/reputation/collect";
import { scanDomain } from "@/lib/domains/scan";
import { DohClient } from "@/lib/domains/dns";
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
  /** Override the reputation mention source (tests inject deterministic ones). */
  reputationSource?: MentionSource;
  /** Override the DNS client for domain scans (tests inject deterministic ones). */
  domainClient?: DohClient;
}

export async function runScheduledCycle(
  store: SchedulerStore,
  deps: SchedulerDeps = {},
): Promise<ScheduledRunSummary> {
  const footprints = await store.listFootprints();
  const now = new Date().toISOString();
  let newExposures = 0;
  let newThreats = 0;
  let recommendations = 0;
  let removalsFiled = 0;
  let casesOpened = 0;
  let mentionsCollected = 0;
  let domainRisksFound = 0;

  for (const fp of footprints) {
    // 1. Discover — only genuinely new findings come back (deduped).
    const finding = await runDiscovery(
      { subject: fp.subject, existing: fp.exposures, existingThreats: fp.threats },
      deps.sources,
    );
    if (finding.exposures.length || finding.threats.length) {
      await store.saveDiscovered(fp.userId, finding.exposures, finding.threats);
    }

    // Record the timestamped, agent-driven investigation for each NEW threat so
    // the Threat Intelligence page shows the real trail, not just a derived one.
    for (const t of finding.threats) {
      const steps = investigationTimeline(t).map((s) => ({ agent: s.agent, label: s.label }));
      await store.recordInvestigation(fp.userId, fp.subject.id, t.title, steps);
    }

    // Auto-open a tracked Case for each NEW high/critical threat, so the case
    // queue (and Mission Control) populates itself from live detections instead
    // of waiting for a human to file one. Deduped against open cases by title.
    if (finding.threats.length > 0) {
      try {
        const openTitles = await store.listOpenCaseTitlesForSubject(fp.subject.id);
        const newCases = casesForNewThreats(finding.threats, openTitles);
        if (newCases.length > 0) {
          await store.createCases(fp.userId, fp.subject.id, newCases);
          await store.recordActions(fp.userId, fp.subject.id, [
            {
              agent: "incident",
              kind: "escalate",
              summary: `Opened ${newCases.length} case(s) from new high/critical threat(s) and assigned the responding agent(s).`,
              status: "completed",
            },
          ]);
          casesOpened += newCases.length;
        }
      } catch (err) {
        // Case creation is best-effort; never fail the whole cycle.
        console.error("[privacyos] auto-open cases failed:", err);
      }
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

    // 6b. Auto-file broker opt-outs for newly-discovered broker/public-record
    // exposures — the Privacy Agent files them so the removal pipeline populates
    // itself from real discoveries (no manual step required).
    try {
      const existing = await store.listRemovalsForSubject(fp.subject.id);
      const filings = planAutoFilings(fp.subject.id, exposures, existing, { now });
      if (filings.requests.length > 0) {
        await store.createRemovals(fp.userId, fp.subject.id, filings.requests);
        await store.recordActions(fp.userId, fp.subject.id, [
          {
            agent: "privacy",
            kind: "remove",
            summary: `Auto-filed ${filings.requests.length} broker opt-out(s) for new listings; 30/60/90-day re-checks scheduled.`,
            status: "completed",
          },
        ]);
        removalsFiled += filings.requests.length;
      }
    } catch (err) {
      // Auto-filing is best-effort; never fail the whole cycle.
      console.error("[privacyos] auto-file removals failed:", err);
    }

    // 7. Refresh ReputationOS: collect news mentions + sentiment for this subject.
    try {
      const rep = await collectReputation(fp.subject, deps.reputationSource, { provider: deps.provider });
      await store.saveReputation(fp.userId, fp.subject.id, {
        mentions: rep.mentions,
        sentimentByDay: rep.sentimentByDay,
      });
      const negatives = rep.mentions.filter((m) => m.sentiment === "negative").length;
      await store.recordActions(fp.userId, fp.subject.id, [
        {
          agent: "reputation",
          kind: "monitor",
          summary: `Reputation sweep: ${rep.mentions.length} mention(s), ${negatives} negative.`,
          status: "completed",
        },
      ]);
      mentionsCollected += rep.mentions.length;
    } catch (err) {
      // Reputation collection is best-effort; never fail the whole cycle.
      console.error("[privacyos] reputation collection failed:", err);
    }

    // 8. Refresh BusinessOS domain monitoring: DNS/email-security assessment.
    try {
      const dom = await scanDomain(fp.subject, deps.domainClient ?? new DohClient());
      if (dom.domain) {
        await store.saveDomainRisks(fp.userId, { domain: dom.domain, risks: dom.risks });
        await store.recordActions(fp.userId, fp.subject.id, [
          {
            agent: "business",
            kind: "monitor",
            summary: `Domain scan of ${dom.domain}: ${dom.risks.length} risk(s).`,
            status: "completed",
          },
        ]);
        domainRisksFound += dom.risks.length;
      }
    } catch (err) {
      console.error("[privacyos] domain scan failed:", err);
    }

    newExposures += finding.exposures.length;
    newThreats += finding.threats.length;
    recommendations += outcome.recommendations.length;
  }

  // 8. Advance any data-broker removals that are due (autonomous 30/60/90 re-checks).
  const due = await store.listDueRemovals(now);
  let removalsAdvanced = 0;
  for (const { userId, request } of due) {
    const next = advanceRemoval(request, { now, reappeared: shouldReappear(request.brokerName) });
    await store.saveRemoval(userId, next);
    removalsAdvanced += 1;
  }

  return {
    subjectsProcessed: footprints.length,
    newExposures,
    newThreats,
    recommendations,
    removalsAdvanced,
    removalsFiled,
    casesOpened,
    mentionsCollected,
    domainRisksFound,
    ranAt: new Date().toISOString(),
  };
}
