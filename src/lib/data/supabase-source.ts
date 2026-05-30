/**
 * Live Supabase data source. All queries are implicitly scoped to the signed-in
 * user by row-level security (see supabase/migrations/0001_init.sql), so there
 * is no need to filter by user_id here — the database enforces tenant isolation.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Subject } from "@/lib/types";
import type { ProtectOutcome } from "@/lib/agents/orchestrator";
import { computeRiskScore } from "@/lib/scoring/risk-score";
import type { DataSource, PrivacyDataSet } from "./source";
import {
  aggregateAgentStates,
  mapCase,
  mapExposure,
  mapRecommendation,
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
}
