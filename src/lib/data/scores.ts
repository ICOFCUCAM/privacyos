/**
 * Score-history reader. Live (signed in): reads the `score_snapshots` written by
 * the scheduled monitoring cycle, grouped into per-kind series. Otherwise a
 * deterministic demo history so the trend chart is populated out of the box.
 */

import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { ScoreKind, ScorePoint } from "@/lib/suite-types";
import { demoRiskScore, demoSubject, demoExposures, demoThreats } from "./demo";
import { mentions, incidents, credentialLeaks, domainRisks, employeeExposures, familyMembers, travelAlerts, thirdPartyRisks } from "./modules";
import { computeScoreSet } from "@/lib/scoring/scores";
import { reputationOverview } from "@/lib/reputation/os/analysis";

const clampScore = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export interface ScoreSeries {
  kind: ScoreKind;
  points: ScorePoint[];
}

/** Deterministic demo history derived from the demo risk score. */
export function demoScoreHistory(): ScoreSeries[] {
  const trend = demoRiskScore.trend;
  const lastOverall = trend[trend.length - 1]?.overall || 1;
  // Anchor each trend to its *current* score so the line lands on today's card.
  const current = computeScoreSet({
    risk: demoRiskScore, mentions, incidents, credentialLeaks, domainRisks, employeeExposures,
    exposures: demoExposures, threats: demoThreats, familyMembers, travelAlerts, thirdPartyRisks, subjectEmails: demoSubject.emails,
  });
  const repHealth = reputationOverview(mentions).health;

  // A risk-shaped series following the demo trajectory, ending exactly at `target`.
  const riskSeries = (kind: ScoreKind, target: number): ScoreSeries => ({
    kind, points: trend.map((p) => ({ date: p.date, value: clampScore(target * (p.overall / lastOverall)) })),
  });
  // Reputation health = inverse of a risk-shaped series ending at (100 − health).
  const reputation: ScoreSeries = {
    kind: "reputation",
    points: trend.map((p) => ({ date: p.date, value: 100 - clampScore((100 - repHealth) * (p.overall / lastOverall)) })),
  };

  return [
    riskSeries("overall", current.overall),
    riskSeries("privacy", current.privacy),
    riskSeries("identity", current.identity),
    reputation,
    riskSeries("executive", current.executive),
  ];
}

export async function getScoreHistory(): Promise<ScoreSeries[]> {
  if (!isSupabaseConfigured()) return demoScoreHistory();
  const db = await getSupabaseServerClient();
  if (!db) return demoScoreHistory();
  let user;
  try {
    const res = await db.auth.getUser();
    user = res.data.user;
  } catch {
    return demoScoreHistory();
  }
  if (!user) return demoScoreHistory();

  // RLS scopes to the current user.
  const { data } = await db
    .from("score_snapshots")
    .select("*")
    .order("taken_at", { ascending: true });

  const byKind = new Map<ScoreKind, ScorePoint[]>();
  for (const row of data ?? []) {
    const list = byKind.get(row.kind) ?? [];
    list.push({ date: row.taken_at, value: row.value });
    byKind.set(row.kind, list);
  }
  // Empty until the scheduler has run; the UI falls back to the current score.
  return [...byKind.entries()].map(([kind, points]) => ({ kind, points }));
}
