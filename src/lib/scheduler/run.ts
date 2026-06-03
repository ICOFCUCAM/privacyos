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
import { coerceMode, needsApproval } from "@/lib/home/autonomy";
import { runPlaybooks, exposureToFinding, threatToFinding } from "@/lib/agents/playbooks";
import { actionEvidence, type EvidenceItem } from "@/lib/intelligence/evidence-vault";
import { casesForNewThreats } from "@/lib/agents/threat-cases";
import { reputationCasesFromMentions } from "@/lib/reputation/os/reputation-cases";
import { reputationOverview } from "@/lib/reputation/os/analysis";
import { executiveRiskIndices } from "@/lib/executive/os/risk-indices";
import { buildThreatActors, actorCasesToOpen } from "@/lib/executive/os/threat-actors";
import { doxxingReport, takedownPlan, summarizeTakedowns, TAKEDOWN_LABEL } from "@/lib/executive/os/doxxing";
import { impersonationReport } from "@/lib/executive/os/impersonation";
import { darkWebReport } from "@/lib/executive/os/darkweb";
import { analyzeAttackSurface } from "@/lib/executive/os/attack-paths";
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
  let reputationCasesOpened = 0;
  let executiveEscalations = 0;
  let executiveCasesOpened = 0;
  let doxxingTakedownsRouted = 0;
  let impersonationSignals = 0;
  let darkWebSignals = 0;
  let attackPathsLive = 0;
  let playbooksAutoExecuted = 0;
  let playbooksAwaitingApproval = 0;
  let evidenceSealed = 0;
  let mentionsCollected = 0;
  let domainRisksFound = 0;

  for (const fp of footprints) {
    // Every autonomous action this subject's cycle performs is sealed here and
    // flushed to the Evidence Vault at the end of the loop, so the vault is a
    // real ledger of what the engine did — not a re-derivation of raw findings.
    const evidence: EvidenceItem[] = [];
    const now0 = new Date().toISOString();

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
          for (const c of newCases) {
            evidence.push(actionEvidence({
              subjectId: fp.subject.id,
              action: `Opened case: ${c.title}`,
              detail: c.summary,
              source: "Incident Agent",
              riskLevel: c.riskLevel,
              collectedBy: c.assignedAgent,
              collectedAt: now0,
              caseTitle: c.title,
            }));
          }
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

    // The customer's consent dial — gates both the playbooks below and the
    // broker auto-filing in step 6f.
    const mode = coerceMode(fp.subject.autonomyMode);

    // 4a. Execute the response playbooks ("recorded plans") against the findings
    // that surfaced this cycle, gated by the subject's autonomy dial. Steps that
    // clear the gate run autonomously and are recorded as completed agent actions
    // — so the customer sees them in the "While you were away" feed; runs that
    // still need sign-off pause and raise a notification for the approval queue.
    // Scoped to NEW findings so a plan isn't re-executed every cron tick.
    const newFindings = [
      ...finding.exposures.map(exposureToFinding),
      ...finding.threats.map(threatToFinding),
    ];
    if (newFindings.length > 0) {
      for (const run of runPlaybooks(newFindings, mode)) {
        if (run.autoSteps > 0) {
          await store.recordActions(fp.userId, fp.subject.id, [
            {
              agent: run.owner,
              kind: "report",
              summary: run.fullyAutonomous
                ? `Ran the ${run.playbookName} playbook end-to-end for "${run.finding.title}" — ${run.autoSteps} step(s) executed autonomously.`
                : `Ran the ${run.playbookName} playbook for "${run.finding.title}" — ${run.autoSteps} step(s) executed, ${run.approvalSteps} awaiting your sign-off.`,
              status: "completed",
            },
          ]);
          // Seal the executed plan as a vault artifact — the proof the response ran.
          evidence.push(actionEvidence({
            subjectId: fp.subject.id,
            action: `Executed ${run.playbookName} playbook (${run.autoSteps} step(s))`,
            detail: `${run.finding.title} — ${run.steps.filter((s) => s.execution === "auto").map((s) => s.label).join("; ")}`,
            source: "Response Playbook",
            riskLevel: run.finding.riskLevel,
            collectedBy: run.owner,
            collectedAt: now0,
          }));
        }
        if (run.fullyAutonomous) {
          playbooksAutoExecuted += 1;
        } else if (run.approvalSteps > 0) {
          playbooksAwaitingApproval += 1;
          await store.addNotifications(fp.userId, [
            {
              kind: "incident",
              title: `Approval needed: ${run.playbookName}`,
              body: `The ${run.playbookName} response for "${run.finding.title}" has ${run.approvalSteps} step(s) waiting on your sign-off.`,
              riskLevel: run.finding.riskLevel,
            },
          ]);
        }
      }
    }

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

    // 6a. Executive-risk escalation. Recompute the Executive Risk Score over the
    // refreshed footprint; if it's critical AND new critical findings landed this
    // cycle, the Executive Agent escalates (record + alert). Gating to new
    // criticals keeps it from re-firing every cron tick.
    const execRisk = executiveRiskIndices({ exposures, threats, family: [], travel: [] });
    await store.recordScores(fp.userId, fp.subject.id, [{ kind: "executive", value: execRisk.overall }]);
    await store.recordActions(fp.userId, fp.subject.id, [
      {
        agent: "executive",
        kind: "monitor",
        summary: `Executive Risk Score: ${execRisk.overall}/100 (${execRisk.band}).`,
        status: "completed",
      },
    ]);
    // Physical-security critical is the true close-protection emergency (the
    // scheduler footprint has no family/travel, so the composite under-reads).
    if ((execRisk.band === "critical" || execRisk.physical >= 70) && critical.length > 0) {
      await store.addNotifications(fp.userId, [
        {
          kind: "incident",
          title: `Executive risk CRITICAL (${execRisk.overall}/100)`,
          body: `New critical exposure pushed the principal's physical-security index to ${execRisk.physical}/100 (overall ${execRisk.overall}). Review Executive Protection now.`,
          riskLevel: "critical",
        },
      ]);
      await store.recordActions(fp.userId, fp.subject.id, [
        { agent: "executive", kind: "escalate", summary: "Escalated principal to CRITICAL executive risk.", status: "completed" },
      ]);
      executiveEscalations += 1;
    }

    // 6b. Threat-actor tracking → protective cases. Cluster the active threats
    // into actor profiles and open an executive-protection case for any actor
    // that's actively escalating or running a harassment campaign (deduped).
    const actors = buildThreatActors(threats, new Date(now).getTime());
    const execOpenTitles = await store.listOpenCaseTitlesForSubject(fp.subject.id);
    const actorCases = actorCasesToOpen(actors, execOpenTitles);
    if (actorCases.length > 0) {
      await store.createCases(fp.userId, fp.subject.id, actorCases);
      await store.recordActions(fp.userId, fp.subject.id, [
        { agent: "executive", kind: "escalate", summary: `Opened ${actorCases.length} protective case(s) for escalating/harassment threat actors.`, status: "completed" },
      ]);
      for (const c of actorCases) {
        evidence.push(actionEvidence({
          subjectId: fp.subject.id,
          action: `Opened protective case: ${c.title}`,
          detail: c.summary,
          source: "Executive Agent",
          riskLevel: c.riskLevel,
          collectedBy: "executive",
          collectedAt: now0,
          caseTitle: c.title,
        }));
      }
      executiveCasesOpened += actorCases.length;
    }

    // 6c. Doxxing takedown routing. Classify the footprint's doxxing-enabling
    // leaks (address/phone/family/employer from exposures + threats) and route
    // each to its remediation channel, so the Executive Agent has a concrete
    // takedown plan. Broker-routable leaks are filed by the removal pipeline
    // below; this records the routed plan and surfaces it on the Doxxing tab.
    const doxxing = doxxingReport({ exposures, threats, family: [], employees: [] });
    const takedowns = takedownPlan(doxxing);
    if (takedowns.length > 0) {
      const routes = Object.entries(summarizeTakedowns(takedowns).byMethod)
        .filter(([, n]) => n > 0)
        .map(([m, n]) => `${n} ${TAKEDOWN_LABEL[m as keyof typeof TAKEDOWN_LABEL]}`)
        .join(", ");
      await store.recordActions(fp.userId, fp.subject.id, [
        { agent: "executive", kind: "remove", summary: `Routed ${takedowns.length} doxxing takedown(s): ${routes}.`, status: "completed" },
      ]);
      evidence.push(actionEvidence({
        subjectId: fp.subject.id,
        action: `Routed ${takedowns.length} doxxing takedown(s)`,
        detail: routes,
        source: "Executive Agent",
        riskLevel: "high",
        collectedBy: "executive",
        collectedAt: now0,
      }));
      doxxingTakedownsRouted += takedowns.length;
    }

    // 6d. Impersonation & dark-web monitoring. Read the footprint for the
    // remaining ExecutiveOS pillars (incidents/domain-risks/credential feeds
    // aren't in the footprint, so this catches the threat/exposure-driven
    // signals) and record the sweep. Takedown/breach cases for these are opened
    // by the threat-case pipeline above; this is observability, not escalation.
    const impersonation = impersonationReport({ threats, incidents: [], domainRisks: [], exposures });
    if (impersonation.active > 0) {
      await store.recordActions(fp.userId, fp.subject.id, [
        { agent: "executive", kind: "monitor", summary: `Tracking ${impersonation.active} impersonation/deepfake signal(s).`, status: "completed" },
      ]);
      impersonationSignals += impersonation.active;
    }
    const darkweb = darkWebReport({ credentialLeaks: [], threats, exposures });
    if (darkweb.active > 0) {
      await store.recordActions(fp.userId, fp.subject.id, [
        { agent: "security", kind: "monitor", summary: `Monitoring ${darkweb.active} dark-web signal(s).`, status: "completed" },
      ]);
      darkWebSignals += darkweb.active;
    }

    // 6e. Attack-path analysis. Model how the footprint chains into real-world
    // harm and surface the highest-leverage fix (the chokepoint) so the cycle
    // autonomously prioritizes the single removal that collapses the most paths.
    const surface = analyzeAttackSurface({ exposures, threats });
    if (surface.chokepoint) {
      await store.recordActions(fp.userId, fp.subject.id, [
        {
          agent: "executive",
          kind: "analyze",
          summary: `${surface.enabledPaths} live attack path(s). Highest-leverage fix: ${surface.chokepoint.action} — collapses ${surface.chokepoint.breaks}.`,
          status: "completed",
        },
      ]);
      attackPathsLive += surface.enabledPaths;
    }

    // 6f. Auto-file broker opt-outs for newly-discovered broker/public-record
    // exposures — the Privacy Agent files them so the removal pipeline populates
    // itself from real discoveries. Honors the subject's autonomy mode: advisor
    // files nothing (everything waits for sign-off), hybrid files routine only,
    // autopilot files everything below critical. Critical always waits.
    try {
      const riskByExposure = new Map(exposures.map((e) => [e.id, e.riskLevel]));
      const existing = await store.listRemovalsForSubject(fp.subject.id);
      const filings = planAutoFilings(fp.subject.id, exposures, existing, { now });
      const eligible = filings.requests.filter(
        (r) => !needsApproval(riskByExposure.get(r.exposureId ?? "") ?? "medium", mode),
      );
      if (eligible.length > 0) {
        await store.createRemovals(fp.userId, fp.subject.id, eligible);
        await store.recordActions(fp.userId, fp.subject.id, [
          {
            agent: "privacy",
            kind: "remove",
            summary: `Auto-filed ${eligible.length} broker opt-out(s) for new listings; 30/60/90-day re-checks scheduled.`,
            status: "completed",
          },
        ]);
        for (const r of eligible) {
          evidence.push(actionEvidence({
            subjectId: fp.subject.id,
            action: `Filed broker opt-out: ${r.brokerName}`,
            detail: `status ${r.status}; re-checks scheduled`,
            source: r.brokerName,
            riskLevel: riskByExposure.get(r.exposureId ?? "") ?? "medium",
            collectedBy: "privacy",
            collectedAt: now0,
          }));
        }
        removalsFiled += eligible.length;
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

      // Reputation-health snapshot for the trend chart (computed from the same
      // mentions; rep.mentions omits id/subjectId but carries every scored field).
      const repHealth = reputationOverview(rep.mentions as unknown as Parameters<typeof reputationOverview>[0]).health;
      await store.recordScores(fp.userId, fp.subject.id, [{ kind: "reputation", value: repHealth }]);

      // Auto-open a reputation-recovery case for defamatory / strongly-negative
      // coverage, so suppression & repair fire autonomously (deduped by title).
      const repOpenTitles = await store.listOpenCaseTitlesForSubject(fp.subject.id);
      const repCases = reputationCasesFromMentions(rep.mentions, repOpenTitles);
      if (repCases.length > 0) {
        await store.createCases(fp.userId, fp.subject.id, repCases);
        await store.recordActions(fp.userId, fp.subject.id, [
          {
            agent: "reputation",
            kind: "escalate",
            summary: `Opened ${repCases.length} reputation-recovery case(s) from negative/defamatory coverage.`,
            status: "completed",
          },
        ]);
        for (const c of repCases) {
          evidence.push(actionEvidence({
            subjectId: fp.subject.id,
            action: `Opened reputation-recovery case: ${c.title}`,
            detail: c.summary,
            source: "Reputation Agent",
            riskLevel: c.riskLevel,
            collectedBy: "reputation",
            collectedAt: now0,
            caseTitle: c.title,
          }));
        }
        reputationCasesOpened += repCases.length;

        // Notify on defamatory coverage, mirroring the critical-threat alert.
        const defamatory = rep.mentions.filter((m) => m.isDefamatory);
        if (defamatory.length > 0) {
          await store.addNotifications(
            fp.userId,
            defamatory.map((m) => ({
              kind: "incident" as const,
              title: `Defamatory content detected: ${m.title}`,
              body: `${m.sourceName} — a reputation-recovery case is open with a suppression & takedown plan.`,
              riskLevel: "high" as const,
            })),
          );
        }
      }
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

    // Flush this subject's sealed artifacts to the Evidence Vault in one write.
    if (evidence.length > 0) {
      try {
        await store.recordEvidence(fp.userId, fp.subject.id, evidence);
        evidenceSealed += evidence.length;
      } catch (err) {
        // Vault persistence is best-effort; never fail the whole cycle.
        console.error("[privacyos] evidence sealing failed:", err);
      }
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
    reputationCasesOpened,
    executiveEscalations,
    executiveCasesOpened,
    doxxingTakedownsRouted,
    impersonationSignals,
    darkWebSignals,
    attackPathsLive,
    playbooksAutoExecuted,
    playbooksAwaitingApproval,
    evidenceSealed,
    mentionsCollected,
    domainRisksFound,
    ranAt: new Date().toISOString(),
  };
}
