/**
 * Score-history reader. Live (signed in): reads the `score_snapshots` written by
 * the scheduled monitoring cycle, grouped into per-kind series. Otherwise a
 * deterministic demo history so the trend chart is populated out of the box.
 */

import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { ScoreKind, ScorePoint } from "@/lib/suite-types";
import { demoRiskScore } from "./demo";

export interface ScoreSeries {
  kind: ScoreKind;
  points: ScorePoint[];
}

/** Deterministic demo history derived from the demo risk score. */
export function demoScoreHistory(): ScoreSeries[] {
  const overall = demoRiskScore.trend.map((p) => ({ date: p.date, value: p.overall }));
  // Identity tracks overall, scaled by the current identity:overall ratio.
  const ratio = demoRiskScore.overall ? demoRiskScore.identity / demoRiskScore.overall : 1;
  const identity = overall.map((p) => ({ date: p.date, value: Math.round(p.value * ratio) }));
  // Reputation health (higher = better) trends opposite to exposure risk.
  const reputation = overall.map((p) => ({ date: p.date, value: Math.max(0, Math.min(100, Math.round(100 - p.value * 0.7))) }));
  // Executive risk (higher = more at risk) tracks the exposure risk score.
  const executive = overall.map((p) => ({ date: p.date, value: Math.max(0, Math.min(100, Math.round(p.value * 0.85))) }));
  return [
    { kind: "overall", points: overall },
    { kind: "privacy", points: overall }, // privacy === exposure overall in the model
    { kind: "identity", points: identity },
    { kind: "reputation", points: reputation },
    { kind: "executive", points: executive },
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
