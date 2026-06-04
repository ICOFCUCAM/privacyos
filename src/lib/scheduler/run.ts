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
import { planCaseActions } from "@/lib/cases/case-actions";
import { LEGAL_TYPE_LABELS } from "@/lib/legal/engine";
import { assessTrips } from "@/lib/intelligence/travel-risk";
import { familyOverview, memberRisks, sharedExposures, childSafety } from "@/lib/family/os/family-os";
import { caseSlaReport } from "@/lib/compliance/case-sla";
import { creditCasesFromAlerts, isFraudIndicator } from "@/lib/credit/credit-os";
import { resolveCreditSource, type CreditSource } from "@/lib/credit/source";
import { casesForNewThreats } from "@/lib/agents/threat-cases";
import type { NewCaseFields } from "@/lib/agents/recommendation-routing";
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
  NewLegalDraft,
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
  /** Override the credit-monitoring source (tests inject a live one). */
  creditSource?: CreditSource;
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
  let legalDrafted = 0;
  let familyCasesOpened = 0;
  let travelRisksFlagged = 0;
  let credentialCasesOpened = 0;
  let employeeCasesOpened = 0;
  let impersonationCasesOpened = 0;
  let slaBreachesEscalated = 0;
  let creditCasesOpened = 0;
  let mentionsCollected = 0;
  let domainRisksFound = 0;

  for (const fp of footprints) {
    // Every autonomous action this subject's cycle performs is sealed here and
    // flushed to the Evidence Vault at the end of the loop, so the vault is a
    // real ledger of what the engine did — not a re-derivation of raw findings.
    const evidence: EvidenceItem[] = [];
    // Cases opened anywhere in this subject's cycle — drafted into legal
    // instruments in one pass below (the Case → Legal cascade).
    const openedCases: NewCaseFields[] = [];
    // The principal's household + itinerary now feed the executive composite and
    // their own protective cascades (steps 6h/6i) — no longer hardcoded empty.
    const family = fp.family ?? [];
    const travel = fp.travel ?? [];
    // Feeds that were previously passed to the engine as []: now wired through so
    // their menu surfaces (Digital Identity, Employee Exposure, Incidents,
    // Domains) actually drive the cycle.
    const credentialLeaks = fp.credentialLeaks ?? [];
    const employees = fp.employeeExposures ?? [];
    const incidents = fp.incidents ?? [];
    const domainRisks = fp.domainRisks ?? [];
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
          openedCases.push(...newCases);
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
    const execRisk = executiveRiskIndices({ exposures, threats, family, travel, credentialLeaks });
    await store.recordScores(fp.userId, fp.subject.id, [{ kind: "executive", value: execRisk.overall }]);
    await store.recordActions(fp.userId, fp.subject.id, [
      {
        agent: "executive",
        kind: "monitor",
        summary: `Executive Risk Score: ${execRisk.overall}/100 (${execRisk.band}).`,
        status: "completed",
      },
    ]);
    // Physical-security critical is the true close-protection emergency; the
    // physical-index fallback also catches address/family exposure the composite
    // might average down.
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
      openedCases.push(...actorCases);
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
    const doxxing = doxxingReport({ exposures, threats, family, employees });
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

    // 6d. Impersonation & dark-web monitoring — now reading the real incident,
    // domain-risk and credential feeds (previously passed empty). When active
    // impersonation/lookalike signals reach high severity, open a takedown case
    // (deduped) so it cascades into the platform-abuse legal draft + evidence.
    const impersonation = impersonationReport({ threats, incidents, domainRisks, exposures });
    if (impersonation.active > 0) {
      await store.recordActions(fp.userId, fp.subject.id, [
        { agent: "executive", kind: "monitor", summary: `Tracking ${impersonation.active} impersonation/deepfake signal(s).`, status: "completed" },
      ]);
      impersonationSignals += impersonation.active;

      if (impersonation.highest === "high" || impersonation.highest === "critical") {
        const impTitle = "Impersonation & lookalike takedown";
        const impOpen = await store.listOpenCaseTitlesForSubject(fp.subject.id);
        if (!impOpen.includes(impTitle)) {
          const impCase: NewCaseFields = {
            type: "impersonation_takedown",
            title: impTitle,
            summary: `${impersonation.active} active impersonation/lookalike signal(s) (highest: ${impersonation.highest}). Pursue platform/registrar takedowns and preserve evidence.`,
            riskLevel: impersonation.highest,
            assignedAgent: "deepfake",
          };
          await store.createCases(fp.userId, fp.subject.id, [impCase]);
          openedCases.push(impCase);
          evidence.push(actionEvidence({
            subjectId: fp.subject.id,
            action: "Opened impersonation takedown case",
            detail: impTitle,
            source: "Executive Agent",
            riskLevel: impCase.riskLevel,
            collectedBy: "deepfake",
            collectedAt: now0,
            caseTitle: impTitle,
          }));
          impersonationCasesOpened += 1;
        }
      }
    }
    const darkweb = darkWebReport({ credentialLeaks, threats, exposures });
    if (darkweb.active > 0) {
      await store.recordActions(fp.userId, fp.subject.id, [
        { agent: "security", kind: "monitor", summary: `Monitoring ${darkweb.active} dark-web signal(s).`, status: "completed" },
      ]);
      darkWebSignals += darkweb.active;
    }

    // 6e. Attack-path analysis. Model how the footprint chains into real-world
    // harm and surface the highest-leverage fix (the chokepoint) so the cycle
    // autonomously prioritizes the single removal that collapses the most paths.
    const surface = analyzeAttackSurface({ exposures, threats, credentialLeaks });
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

    // 6e-iii. Credential-breach response. Leaked credentials (the Digital Identity
    // feed) now open an account-takeover breach case per distinct breach (deduped)
    // and alert on critical — the single highest-value individual risk that was
    // previously invisible to the engine. Cascades to evidence.
    const credHigh = credentialLeaks.filter((l) => l.riskLevel === "high" || l.riskLevel === "critical");
    if (credHigh.length > 0) {
      const credOpen = await store.listOpenCaseTitlesForSubject(fp.subject.id);
      const credCases: NewCaseFields[] = [];
      for (const l of credHigh) {
        const title = `Credential breach: ${l.breachName}`;
        if (credOpen.includes(title) || credCases.some((c) => c.title === title)) continue;
        credCases.push({
          type: "breach_response",
          title,
          summary: `${l.account} exposed in ${l.breachName} (${(l.pwnCount || 0).toLocaleString()} records${l.dataClasses.length ? `, ${l.dataClasses.join(", ")}` : ""}). Rotate credentials, enable MFA and lock down reuse.`,
          riskLevel: l.riskLevel,
          assignedAgent: "security",
        });
      }
      if (credCases.length > 0) {
        await store.createCases(fp.userId, fp.subject.id, credCases);
        openedCases.push(...credCases);
        await store.recordActions(fp.userId, fp.subject.id, [
          { agent: "security", kind: "escalate", summary: `Opened ${credCases.length} account-takeover breach case(s) from leaked credentials.`, status: "completed" },
        ]);
        for (const c of credCases) {
          evidence.push(actionEvidence({
            subjectId: fp.subject.id,
            action: `Opened breach case: ${c.title}`,
            detail: c.summary,
            source: "Security Agent",
            riskLevel: c.riskLevel,
            collectedBy: "security",
            collectedAt: now0,
            caseTitle: c.title,
          }));
        }
        const criticalCreds = credCases.filter((c) => c.riskLevel === "critical");
        if (criticalCreds.length > 0) {
          await store.addNotifications(fp.userId, criticalCreds.map((c) => ({
            kind: "incident" as const,
            title: `Critical credential breach: ${c.title.replace("Credential breach: ", "")}`,
            body: c.summary,
            riskLevel: "critical" as const,
          })));
        }
        credentialCasesOpened += credCases.length;
      }
    }

    // 6e-iv. Workforce exposure. High-risk employee/workforce exposure (the
    // Employee Exposure feed) opens a single org breach-review case (stable title,
    // deduped) so the SMB/enterprise promise — "watch my team" — actually runs.
    const empHigh = employees.filter((e) => e.riskLevel === "high" || e.riskLevel === "critical");
    if (empHigh.length > 0) {
      const empTitle = "Employee exposure review";
      const empOpen = await store.listOpenCaseTitlesForSubject(fp.subject.id);
      if (!empOpen.includes(empTitle)) {
        const empCase: NewCaseFields = {
          type: "breach_response",
          title: empTitle,
          summary: `${empHigh.length} employee account(s) at high/critical exposure (e.g. ${empHigh.slice(0, 3).map((e) => e.employeeEmail).join(", ")}). Force resets, notify staff, and monitor for reuse.`,
          riskLevel: empHigh.some((e) => e.riskLevel === "critical") ? "critical" : "high",
          assignedAgent: "business",
        };
        await store.createCases(fp.userId, fp.subject.id, [empCase]);
        openedCases.push(empCase);
        await store.recordActions(fp.userId, fp.subject.id, [
          { agent: "business", kind: "escalate", summary: `Opened employee-exposure review case for ${empHigh.length} high-risk account(s).`, status: "completed" },
        ]);
        evidence.push(actionEvidence({
          subjectId: fp.subject.id,
          action: "Opened employee-exposure review case",
          detail: empCase.summary,
          source: "Business Agent",
          riskLevel: empCase.riskLevel,
          collectedBy: "business",
          collectedAt: now0,
          caseTitle: empTitle,
        }));
        employeeCasesOpened += 1;
      }
    }

    // 6e-i. Travel risk. Score the principal's itinerary against their live
    // footprint and flag elevated/high-posture upcoming trips (record + alert +
    // seal). Travel now feeds the executive composite above, so a risky trip
    // raises the principal's score rather than being invisible to the engine.
    if (travel.length > 0) {
      const trips = assessTrips(travel, exposures, threats);
      const elevated = trips
        .filter((t) => t.upcoming && (t.posture === "high" || t.posture === "elevated"))
        .sort((a, b) => b.riskScore - a.riskScore);
      if (elevated.length > 0) {
        const worst = elevated[0];
        await store.recordActions(fp.userId, fp.subject.id, [
          { agent: "executive", kind: "monitor", summary: `Travel risk: ${elevated.length} upcoming trip(s) at elevated/high posture (worst: ${worst.alert.destination}).`, status: "completed" },
        ]);
        await store.addNotifications(fp.userId, [
          {
            kind: "incident",
            title: `Travel risk: ${worst.alert.destination}`,
            body: `${worst.posture} posture${worst.daysUntil != null ? ` · departs in ${worst.daysUntil} day(s)` : ""}. ${worst.alert.advisory}`,
            riskLevel: worst.alert.riskLevel,
          },
        ]);
        evidence.push(actionEvidence({
          subjectId: fp.subject.id,
          action: `Flagged ${elevated.length} elevated-risk trip(s)`,
          detail: elevated.map((t) => `${t.alert.destination} (${t.posture})`).join("; "),
          source: "Executive Agent",
          riskLevel: worst.alert.riskLevel,
          collectedBy: "executive",
          collectedAt: now0,
        }));
        travelRisksFlagged += elevated.length;
      }
    }

    // 6e-ii. Family protection. Roll the household roster up against the shared
    // footprint; when a child-safety alert or high/critical relative exposure
    // surfaces, open a protective case (deduped) and push it into openedCases so
    // it inherits the Case → Legal + Evidence cascades. Family now feeds the
    // executive composite, so household risk lifts the principal's score too.
    if (family.length > 0) {
      const fo = familyOverview(family, exposures);
      const safety = childSafety(memberRisks(family, sharedExposures(exposures)));
      if (safety.alerts.length > 0) {
        await store.recordActions(fp.userId, fp.subject.id, [
          { agent: "executive", kind: "monitor", summary: `Family sweep: ${fo.members} member(s), risk ${fo.familyRisk}/100, ${safety.alerts.length} child-safety/at-risk alert(s).`, status: "completed" },
        ]);
        const famTitle = `Family protection: ${safety.alerts.length} household member(s) at risk`;
        const famOpenTitles = await store.listOpenCaseTitlesForSubject(fp.subject.id);
        if (!famOpenTitles.includes(famTitle)) {
          const famCase: NewCaseFields = {
            type: "executive_protection",
            title: famTitle,
            summary: `${safety.alerts.length} household member(s) crossed the risk threshold (family risk ${fo.familyRisk}/100). Protective review of the household's shared exposure recommended.`,
            riskLevel: safety.alerts.some((a) => a.member.riskLevel === "critical") ? "critical" : "high",
            assignedAgent: "executive",
          };
          await store.createCases(fp.userId, fp.subject.id, [famCase]);
          openedCases.push(famCase);
          evidence.push(actionEvidence({
            subjectId: fp.subject.id,
            action: "Opened family-protection case",
            detail: famTitle,
            source: "Executive Agent",
            riskLevel: famCase.riskLevel,
            collectedBy: "executive",
            collectedAt: now0,
            caseTitle: famTitle,
          }));
          familyCasesOpened += 1;
        }
      }
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
        openedCases.push(...repCases);
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

    // 6e-iv-b. Credit-file monitoring (paid `credit` feature). Checks are
    // MANUAL by default — the scheduler pulls only when the customer opted into
    // auto (creditAuto) AND a pull is due per the plan's cadence (creditDue),
    // keeping it cost-efficient. We record every scheduled pull to throttle the
    // next one, and open identity-theft cases only on LIVE bureau data (never
    // from the demo profile) — those cascade into Legal + Evidence.
    if (fp.creditEnabled && fp.creditAuto && fp.creditDue) {
      try {
        const { profile, live } = await (deps.creditSource ?? resolveCreditSource()).fetch(fp.subject.id);
        await store.markCreditChecked(fp.subject.id);
        if (live) {
          const creditOpen = await store.listOpenCaseTitlesForSubject(fp.subject.id);
          const creditCases = creditCasesFromAlerts(profile.alerts, creditOpen);
          if (creditCases.length > 0) {
            const fraudCount = profile.alerts.filter((a) => isFraudIndicator(a.kind)).length;
            await store.createCases(fp.userId, fp.subject.id, creditCases);
            openedCases.push(...creditCases);
            await store.recordActions(fp.userId, fp.subject.id, [
              { agent: "security", kind: "escalate", summary: `Opened a credit-file identity-theft case from ${fraudCount} fraud-indicative bureau alert(s).`, status: "completed" },
            ]);
            for (const c of creditCases) {
              evidence.push(actionEvidence({
                subjectId: fp.subject.id,
                action: `Opened case: ${c.title}`,
                detail: c.summary,
                source: "Security Agent",
                riskLevel: c.riskLevel,
                collectedBy: "security",
                collectedAt: now0,
                caseTitle: c.title,
              }));
            }
            creditCasesOpened += creditCases.length;
          }
        }
      } catch (err) {
        // Credit monitoring is best-effort; never fail the whole cycle.
        console.error("[privacyos] credit monitoring failed:", err);
      }
    }

    // 6e-v. Response-SLA clock. Watch every open case against its risk-based
    // response deadline; when one breaches, auto-escalate it (status → escalated),
    // alert the owner and seal the breach — turning Compliance into a live
    // governance loop. Idempotent: escalating removes the case from the clock.
    const openCases = fp.cases ?? [];
    if (openCases.length > 0) {
      const breached = caseSlaReport(openCases, Date.now()).items.filter((i) => i.status === "breached");
      for (const item of breached) {
        await store.markCaseEscalated(item.id);
        await store.recordActions(fp.userId, fp.subject.id, [
          { agent: item.assignedAgent, kind: "escalate", summary: `SLA breach: "${item.title}" exceeded its ${item.riskLevel} response deadline — auto-escalated.`, status: "completed" },
        ]);
        await store.addNotifications(fp.userId, [
          { kind: "incident", title: `SLA breach escalated: ${item.title}`, body: `The ${item.riskLevel} response deadline (due ${item.dueAt.slice(0, 10)}) has passed. The case has been escalated for immediate attention.`, riskLevel: item.riskLevel },
        ]);
        evidence.push(actionEvidence({
          subjectId: fp.subject.id,
          action: `Escalated SLA breach: ${item.title}`,
          detail: `${item.riskLevel} response deadline missed (due ${item.dueAt}).`,
          source: "Compliance",
          riskLevel: item.riskLevel,
          collectedBy: item.assignedAgent,
          collectedAt: now0,
          caseTitle: item.title,
        }));
        slaBreachesEscalated += 1;
      }
    }

    // 6g. Case → Legal cascade. Each newly-opened case with a legal dimension
    // auto-drafts its instrument from real case facts (a reputation-recovery
    // case → a defamation/takedown demand; an executive-protection case → a
    // privacy-violation notice), persists it as a reviewable draft, and seals it
    // into the vault. Broker opt-outs a case implies are filed by step 6f, so
    // only the legal artifact is taken here (plan.removals is ignored).
    if (openedCases.length > 0) {
      const drafts: NewLegalDraft[] = [];
      for (const c of openedCases) {
        const plan = planCaseActions(
          { type: c.type, title: c.title, subjectId: fp.subject.id },
          { subjectName: fp.subject.displayName ?? "the data subject", exposures, existingRemovals: [] },
        );
        if (!plan.legal) continue;
        drafts.push({ type: plan.legal.type, recipient: plan.legal.recipient, body: plan.legal.body, caseTitle: c.title });
        evidence.push(actionEvidence({
          subjectId: fp.subject.id,
          action: `Drafted ${LEGAL_TYPE_LABELS[plan.legal.type]}`,
          detail: `Recipient: ${plan.legal.recipient} — for case "${c.title}"`,
          source: "Legal Agent",
          riskLevel: c.riskLevel,
          collectedBy: "legal",
          collectedAt: now0,
          caseTitle: c.title,
        }));
      }
      if (drafts.length > 0) {
        try {
          await store.createLegalDrafts(fp.userId, fp.subject.id, drafts);
          await store.recordActions(fp.userId, fp.subject.id, [
            {
              agent: "legal",
              kind: "draft_legal",
              summary: `Drafted ${drafts.length} legal document(s) from newly-opened case(s) — ready for your review.`,
              status: "completed",
            },
          ]);
          legalDrafted += drafts.length;
        } catch (err) {
          // Legal drafting is best-effort; never fail the whole cycle.
          console.error("[privacyos] legal drafting failed:", err);
        }
      }
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
    legalDrafted,
    familyCasesOpened,
    travelRisksFlagged,
    credentialCasesOpened,
    employeeCasesOpened,
    impersonationCasesOpened,
    slaBreachesEscalated,
    creditCasesOpened,
    mentionsCollected,
    domainRisksFound,
    ranAt: new Date().toISOString(),
  };
}
