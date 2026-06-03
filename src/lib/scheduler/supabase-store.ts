/**
 * Service-role SchedulerStore. Reads/writes across all tenants, setting user_id
 * explicitly on every insert because the scheduler runs without an auth session
 * (RLS is bypassed, so tenant ownership must be written by hand).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Exposure, Recommendation, RemovalRequest, Threat } from "@/lib/types";
import type { ProtectOutcome } from "@/lib/agents/orchestrator";
import type { NewCaseFields } from "@/lib/agents/recommendation-routing";
import type { EvidenceItem } from "@/lib/intelligence/evidence-vault";
import { mapExposure, mapRemoval, mapSubject, mapThreat } from "@/lib/data/mappers";
import { isRemovalDue } from "@/lib/brokers/removal";
import type {
  DomainScanData,
  Footprint,
  NewAgentAction,
  NewLegalDraft,
  NewNotification,
  OwnedRemoval,
  ReputationData,
  ScoreEntry,
  SchedulerStore,
} from "./store";

export class SupabaseSchedulerStore implements SchedulerStore {
  constructor(private db: SupabaseClient) {}

  async listFootprints(): Promise<Footprint[]> {
    const [{ data: subjects }, { data: exposures }, { data: threats }] = await Promise.all([
      this.db.from("subjects").select("*"),
      this.db.from("exposures").select("*"),
      this.db.from("threats").select("*"),
    ]);

    const expBySubject = new Map<string, Exposure[]>();
    for (const row of exposures ?? []) {
      const list = expBySubject.get(row.subject_id) ?? [];
      list.push(mapExposure(row));
      expBySubject.set(row.subject_id, list);
    }
    const thrBySubject = new Map<string, Threat[]>();
    for (const row of threats ?? []) {
      const list = thrBySubject.get(row.subject_id) ?? [];
      list.push(mapThreat(row));
      thrBySubject.set(row.subject_id, list);
    }

    return (subjects ?? []).map((row) => ({
      userId: row.user_id,
      subject: mapSubject(row),
      exposures: expBySubject.get(row.id) ?? [],
      threats: thrBySubject.get(row.id) ?? [],
    }));
  }

  async saveDiscovered(userId: string, exposures: Exposure[], threats: Threat[]): Promise<void> {
    if (exposures.length > 0) {
      await this.db.from("exposures").insert(
        exposures.map((e) => ({
          user_id: userId,
          subject_id: e.subjectId,
          category: e.category,
          source: e.source,
          source_name: e.sourceName,
          url: e.url ?? null,
          snippet: e.snippet,
          risk_level: e.riskLevel,
          risk_score: e.riskScore,
          status: e.status,
          discovered_at: e.discoveredAt,
          last_seen_at: e.lastSeenAt,
        })),
      );
    }
    if (threats.length > 0) {
      await this.db.from("threats").insert(
        threats.map((t) => ({
          user_id: userId,
          subject_id: t.subjectId,
          kind: t.kind,
          title: t.title,
          detail: t.detail,
          risk_level: t.riskLevel,
          source: t.source,
          detected_at: t.detectedAt,
          acknowledged: t.acknowledged,
        })),
      );
    }
  }

  async replaceRecommendations(userId: string, subjectId: string, recs: Recommendation[]): Promise<void> {
    await this.db
      .from("recommendations")
      .delete()
      .eq("subject_id", subjectId)
      .eq("approved", false);
    if (recs.length > 0) {
      await this.db.from("recommendations").insert(
        recs.map((r) => ({
          user_id: userId,
          subject_id: subjectId,
          agent: r.agent,
          title: r.title,
          rationale: r.rationale,
          risk_level: r.riskLevel,
          impact: r.impact,
          action_label: r.actionLabel,
        })),
      );
    }
  }

  async recordRun(userId: string, outcome: ProtectOutcome): Promise<void> {
    await this.db.from("agent_runs").insert(
      outcome.agentStates.map((a) => ({
        user_id: userId,
        subject_id: outcome.subjectId,
        agent: a.kind,
        items_handled: a.itemsHandled,
        log: outcome.log.filter((l) => l.startsWith(`[${a.kind}]`)),
      })),
    );
  }

  async recordActions(userId: string, subjectId: string, actions: NewAgentAction[]): Promise<void> {
    if (actions.length === 0) return;
    await this.db.from("agent_actions").insert(
      actions.map((a) => ({
        user_id: userId,
        subject_id: subjectId,
        agent: a.agent,
        kind: a.kind,
        summary: a.summary,
        status: a.status,
      })),
    );
  }

  async recordScores(userId: string, subjectId: string, scores: ScoreEntry[]): Promise<void> {
    if (scores.length === 0) return;
    await this.db.from("score_snapshots").insert(
      scores.map((s) => ({ user_id: userId, subject_id: subjectId, kind: s.kind, value: s.value })),
    );
  }

  async addNotifications(userId: string, notifs: NewNotification[]): Promise<void> {
    if (notifs.length === 0) return;
    await this.db.from("notifications").insert(
      notifs.map((n) => ({
        user_id: userId,
        kind: n.kind,
        title: n.title,
        body: n.body,
        risk_level: n.riskLevel ?? null,
      })),
    );
  }

  async listDueRemovals(now: string): Promise<OwnedRemoval[]> {
    const { data } = await this.db.from("removal_requests").select("*");
    return (data ?? [])
      .map((row) => ({ userId: row.user_id as string, request: mapRemoval(row) }))
      .filter((o) => isRemovalDue(o.request, now));
  }

  async listRemovalsForSubject(subjectId: string): Promise<RemovalRequest[]> {
    const { data } = await this.db.from("removal_requests").select("*").eq("subject_id", subjectId);
    return (data ?? []).map(mapRemoval);
  }

  async createRemovals(userId: string, subjectId: string, requests: Omit<RemovalRequest, "id">[]): Promise<void> {
    if (requests.length === 0) return;
    await this.db.from("removal_requests").insert(
      requests.map((r) => ({
        user_id: userId,
        subject_id: subjectId,
        exposure_id: r.exposureId ?? null,
        broker_name: r.brokerName,
        status: r.status,
        submitted_at: r.submittedAt,
        next_check_at: r.nextCheckAt ?? null,
        history: r.history,
      })),
    );
    // Sync each linked exposure so autonomous filings actually lower the score.
    for (const r of requests) {
      if (r.exposureId) await this.db.from("exposures").update({ status: r.status }).eq("id", r.exposureId);
    }
  }

  async saveRemoval(_userId: string, request: RemovalRequest): Promise<void> {
    await this.db
      .from("removal_requests")
      .update({
        status: request.status,
        submitted_at: request.submittedAt,
        next_check_at: request.nextCheckAt ?? null,
        history: request.history,
      })
      .eq("id", request.id);
    // Advance the linked exposure in lockstep (in_progress → removed → ...).
    if (request.exposureId) {
      await this.db.from("exposures").update({ status: request.status }).eq("id", request.exposureId);
    }
  }

  async saveReputation(userId: string, subjectId: string, data: ReputationData): Promise<void> {
    // Replace prior mentions + sentiment for an idempotent refresh.
    await this.db.from("mentions").delete().eq("subject_id", subjectId);
    if (data.mentions.length > 0) {
      await this.db.from("mentions").insert(
        data.mentions.map((m) => ({
          user_id: userId,
          subject_id: subjectId,
          channel: m.channel,
          source_name: m.sourceName,
          url: m.url ?? null,
          title: m.title,
          excerpt: m.excerpt,
          sentiment: m.sentiment,
          sentiment_score: m.sentimentScore,
          is_defamatory: m.isDefamatory,
          detected_at: m.detectedAt,
        })),
      );
    }
    await this.db.from("sentiment_records").delete().eq("subject_id", subjectId);
    if (data.sentimentByDay.length > 0) {
      await this.db.from("sentiment_records").insert(
        data.sentimentByDay.map((d) => ({
          user_id: userId,
          subject_id: subjectId,
          recorded_on: d.date,
          positive: d.positive,
          neutral: d.neutral,
          negative: d.negative,
          net_score: d.netScore,
        })),
      );
    }
  }

  async saveDomainRisks(userId: string, data: DomainScanData): Promise<void> {
    // Upsert the domain row, then replace its risks with the fresh assessment.
    const { data: existing } = await this.db
      .from("domains")
      .select("id")
      .eq("domain", data.domain)
      .maybeSingle();
    let domainId = existing?.id as string | undefined;
    if (!domainId) {
      const { data: inserted } = await this.db
        .from("domains")
        .insert({ user_id: userId, domain: data.domain, is_primary: true })
        .select("id")
        .single();
      domainId = inserted?.id;
    }
    if (!domainId) return;
    await this.db.from("domain_risks").delete().eq("domain_id", domainId);
    if (data.risks.length > 0) {
      await this.db.from("domain_risks").insert(
        data.risks.map((r) => ({
          user_id: userId,
          domain_id: domainId,
          kind: r.kind,
          detail: r.detail,
          risk_level: r.riskLevel,
          resolved: false,
        })),
      );
    }
  }

  async recordInvestigation(
    userId: string,
    subjectId: string,
    threatTitle: string,
    steps: { agent: string; label: string }[],
  ): Promise<void> {
    if (steps.length === 0) return;
    // Resolve the most-recent threat row for this subject+title.
    const { data: threat } = await this.db
      .from("threats")
      .select("id")
      .eq("subject_id", subjectId)
      .eq("title", threatTitle)
      .order("detected_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!threat) return;
    // Stagger timestamps a few minutes apart so the timeline reads chronologically.
    const base = Date.now();
    await this.db.from("threat_investigations").insert(
      steps.map((s, i) => ({
        user_id: userId,
        subject_id: subjectId,
        threat_id: threat.id,
        agent: s.agent,
        label: s.label,
        created_at: new Date(base + i * 6 * 60_000).toISOString(),
      })),
    );
  }

  async listOpenCaseTitlesForSubject(subjectId: string): Promise<string[]> {
    const { data } = await this.db
      .from("cases")
      .select("title")
      .eq("subject_id", subjectId)
      .neq("status", "resolved");
    return (data ?? []).map((r) => r.title as string);
  }

  async createCases(userId: string, subjectId: string, cases: NewCaseFields[]): Promise<void> {
    if (cases.length === 0) return;
    await this.db.from("cases").insert(
      cases.map((c) => ({
        user_id: userId,
        subject_id: subjectId,
        type: c.type,
        title: c.title,
        summary: c.summary,
        status: "open",
        risk_level: c.riskLevel,
        assigned_agent: c.assignedAgent,
      })),
    );
  }

  async recordEvidence(userId: string, subjectId: string, items: EvidenceItem[]): Promise<void> {
    if (items.length === 0) return;
    // Link each artifact to its supporting case by title (cases are deduped by
    // title), so the vault row points back at a real, tracked case.
    const titles = [...new Set(items.map((i) => i.caseTitle).filter((t): t is string => !!t))];
    const caseIdByTitle = new Map<string, string>();
    if (titles.length > 0) {
      const { data } = await this.db.from("cases").select("id,title").eq("subject_id", subjectId).in("title", titles);
      for (const row of data ?? []) caseIdByTitle.set(row.title as string, row.id as string);
    }
    await this.db.from("evidence_records").insert(
      items.map((e) => ({
        user_id: userId,
        subject_id: subjectId,
        kind: e.kind,
        title: e.title,
        source: e.source,
        hash: e.hash,
        risk_level: e.riskLevel,
        collected_by: e.collectedBy,
        collected_at: e.collectedAt,
        case_id: e.caseTitle ? caseIdByTitle.get(e.caseTitle) ?? null : null,
        case_title: e.caseTitle ?? null,
        custody: e.custody,
      })),
    );
  }

  async createLegalDrafts(userId: string, subjectId: string, drafts: NewLegalDraft[]): Promise<void> {
    if (drafts.length === 0) return;
    await this.db.from("legal_requests").insert(
      drafts.map((d) => ({
        user_id: userId,
        subject_id: subjectId,
        type: d.type,
        recipient: d.recipient,
        status: "draft",
        body: d.body,
      })),
    );
  }
}
