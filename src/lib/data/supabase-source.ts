/**
 * Live Supabase data source. All queries are implicitly scoped to the signed-in
 * user by row-level security (see supabase/migrations/0001_init.sql), so there
 * is no need to filter by user_id here — the database enforces tenant isolation.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { RemovalRequest, Subject } from "@/lib/types";
import type { ProtectOutcome } from "@/lib/agents/orchestrator";
import type { DiscoveryFinding } from "@/lib/discovery/source";
import { computeRiskScore } from "@/lib/scoring/risk-score";
import { advanceRemoval, createRemoval, shouldReappear } from "@/lib/brokers/removal";
import { caseFromRecommendation } from "@/lib/agents/recommendation-routing";
import type { DataSource, PrivacyDataSet } from "./source";
import {
  aggregateAgentStates,
  mapCase,
  mapExposure,
  mapRecommendation,
  mapRemoval,
  mapSubject,
  mapThreat,
} from "./mappers";

export class SupabaseDataSource implements DataSource {
  readonly live = true;
  constructor(private db: SupabaseClient) {}

  async getPrimarySubject(): Promise<Subject | null> {
    const { data, error } = await this.db
      .from("subjects")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? mapSubject(data) : null;
  }

  async getDataset(subjectId?: string): Promise<PrivacyDataSet> {
    const subjectRow = subjectId
      ? (await this.db.from("subjects").select("*").eq("id", subjectId).single()).data
      : (await this.db.from("subjects").select("*").order("created_at").limit(1).single()).data;

    if (!subjectRow) throw new Error("No subject found for the current user.");
    const subject = mapSubject(subjectRow);

    const [exposuresRes, threatsRes, casesRes, recsRes, runsRes] = await Promise.all([
      this.db.from("exposures").select("*").eq("subject_id", subject.id).order("last_seen_at", { ascending: false }),
      this.db.from("threats").select("*").eq("subject_id", subject.id).order("detected_at", { ascending: false }),
      this.db.from("cases").select("*").eq("subject_id", subject.id).order("updated_at", { ascending: false }),
      this.db.from("recommendations").select("*").eq("subject_id", subject.id).eq("approved", false),
      this.db.from("agent_runs").select("*").eq("subject_id", subject.id),
    ]);

    const exposures = (exposuresRes.data ?? []).map(mapExposure);
    const threats = (threatsRes.data ?? []).map(mapThreat);
    const cases = (casesRes.data ?? []).map(mapCase);
    const recommendations = (recsRes.data ?? []).map(mapRecommendation).sort((a, b) => b.impact - a.impact);
    const agents = aggregateAgentStates(runsRes.data ?? []);
    const riskScore = computeRiskScore(exposures, threats);

    return { subject, exposures, threats, cases, recommendations, agents, riskScore };
  }

  async acknowledgeThreat(id: string): Promise<void> {
    const { error } = await this.db.from("threats").update({ acknowledged: true }).eq("id", id);
    if (error) throw error;
  }

  async approveRecommendation(id: string): Promise<void> {
    // Approving a recommendation opens a real, tracked Case assigned to the
    // owning agent, then marks the recommendation approved (so it leaves the
    // queue). This turns approval into actual remediation work, not just a flag.
    const { data: rec, error: recErr } = await this.db
      .from("recommendations")
      .select("id,subject_id,agent,title,rationale,risk_level")
      .eq("id", id)
      .maybeSingle();
    if (recErr) throw recErr;

    if (rec) {
      const fields = caseFromRecommendation({
        id: rec.id,
        agent: rec.agent,
        title: rec.title,
        rationale: rec.rationale ?? "",
        riskLevel: rec.risk_level,
      });
      const { error: caseErr } = await this.db.from("cases").insert({
        subject_id: rec.subject_id,
        type: fields.type,
        title: fields.title,
        summary: fields.summary,
        status: "in_progress",
        risk_level: fields.riskLevel,
        assigned_agent: fields.assignedAgent,
      });
      if (caseErr) throw caseErr;
    }

    const { error } = await this.db.from("recommendations").update({ approved: true }).eq("id", id);
    if (error) throw error;
  }

  async persistProtectRun(outcome: ProtectOutcome): Promise<void> {
    // One audit row per agent, carrying that agent's log lines.
    const runRows = outcome.agentStates.map((a) => ({
      subject_id: outcome.subjectId,
      agent: a.kind,
      items_handled: a.itemsHandled,
      log: outcome.log.filter((l) => l.startsWith(`[${a.kind}]`)),
    }));
    const { error: runErr } = await this.db.from("agent_runs").insert(runRows);
    if (runErr) throw runErr;

    // Replace (not append) the open recommendation set for this subject, so
    // repeated protect runs don't pile up duplicate rows. Approved
    // recommendations are preserved — they've become tracked cases.
    const { error: delErr } = await this.db
      .from("recommendations")
      .delete()
      .eq("subject_id", outcome.subjectId)
      .eq("approved", false);
    if (delErr) throw delErr;

    if (outcome.recommendations.length > 0) {
      const recRows = outcome.recommendations.map((r) => ({
        subject_id: r.subjectId,
        agent: r.agent,
        title: r.title,
        rationale: r.rationale,
        risk_level: r.riskLevel,
        impact: r.impact,
        action_label: r.actionLabel,
      }));
      const { error: recErr } = await this.db.from("recommendations").insert(recRows);
      if (recErr) throw recErr;
    }
  }

  async persistDiscovery(finding: DiscoveryFinding): Promise<void> {
    if (finding.exposures.length > 0) {
      const rows = finding.exposures.map((e) => ({
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
      }));
      const { error } = await this.db.from("exposures").insert(rows);
      if (error) throw error;
    }
    if (finding.threats.length > 0) {
      const rows = finding.threats.map((t) => ({
        subject_id: t.subjectId,
        kind: t.kind,
        title: t.title,
        detail: t.detail,
        risk_level: t.riskLevel,
        source: t.source,
        detected_at: t.detectedAt,
        acknowledged: t.acknowledged,
      }));
      const { error } = await this.db.from("threats").insert(rows);
      if (error) throw error;
    }
  }

  async listRemovals(): Promise<RemovalRequest[]> {
    const { data, error } = await this.db
      .from("removal_requests")
      .select("*")
      .order("submitted_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapRemoval);
  }

  async createRemoval(brokerName: string, exposureId?: string): Promise<void> {
    const subject = await this.getPrimarySubject();
    if (!subject) throw new Error("No subject to file a removal for.");
    const req = createRemoval(brokerName, { subjectId: subject.id, exposureId });
    const { error } = await this.db.from("removal_requests").insert({
      subject_id: req.subjectId,
      exposure_id: req.exposureId ?? null,
      broker_name: req.brokerName,
      status: req.status,
      submitted_at: req.submittedAt,
      next_check_at: req.nextCheckAt ?? null,
      history: req.history,
    });
    if (error) throw error;
    // Reflect remediation on the exposure itself so the risk score drops as the
    // fleet works — otherwise filing a removal leaves the score untouched.
    if (req.exposureId) {
      await this.db.from("exposures").update({ status: req.status }).eq("id", req.exposureId);
    }
  }

  async setAutonomyMode(mode: "autopilot" | "hybrid" | "advisor"): Promise<void> {
    const subject = await this.getPrimarySubject();
    if (!subject) return;
    // Best-effort: tolerate the column not existing yet (pre-migration).
    try {
      await this.db.from("subjects").update({ autonomy_mode: mode }).eq("id", subject.id);
    } catch {
      /* column missing until migration 0013 applies — the cookie still drives the UI */
    }
  }

  async recheckRemoval(id: string): Promise<void> {
    const { data, error } = await this.db.from("removal_requests").select("*").eq("id", id).single();
    if (error) throw error;
    const next = advanceRemoval(mapRemoval(data), {
      reappeared: shouldReappear(data.broker_name),
    });
    const { error: upErr } = await this.db
      .from("removal_requests")
      .update({
        status: next.status,
        submitted_at: next.submittedAt,
        next_check_at: next.nextCheckAt ?? null,
        history: next.history,
      })
      .eq("id", id);
    if (upErr) throw upErr;
    // Keep the linked exposure's status in lockstep so the score tracks progress
    // (in_progress → removed lowers it; reappeared raises it again).
    if (data.exposure_id) {
      await this.db.from("exposures").update({ status: next.status }).eq("id", data.exposure_id);
    }
  }
}
