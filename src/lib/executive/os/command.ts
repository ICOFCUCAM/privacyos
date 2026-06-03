/**
 * Executive Protection OS — command dashboard data.
 *
 * Aggregations for the executive command view: an exposure heat map (category ×
 * severity), a cross-threat timeline, and an exposure-by-category graph. Pure
 * and unit-tested.
 */

import type { Exposure, ExposureCategory, RiskLevel, Threat, ThreatKind } from "@/lib/types";

const RISK_RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };
const LEVELS: RiskLevel[] = ["low", "medium", "high", "critical"];

export interface HeatRow {
  category: ExposureCategory;
  counts: Record<RiskLevel, number>;
  total: number;
}

/** Exposure heat map: one row per category present, counts by severity. */
export function exposureHeatMap(exposures: Exposure[]): HeatRow[] {
  const byCat = new Map<ExposureCategory, Record<RiskLevel, number>>();
  for (const e of exposures) {
    const row = byCat.get(e.category) ?? { low: 0, medium: 0, high: 0, critical: 0 };
    row[e.riskLevel] += 1;
    byCat.set(e.category, row);
  }
  return [...byCat.entries()]
    .map(([category, counts]) => ({ category, counts, total: LEVELS.reduce((s, l) => s + counts[l], 0) }))
    .sort((a, b) => weight(b.counts) - weight(a.counts));
}

function weight(counts: Record<RiskLevel, number>): number {
  return LEVELS.reduce((s, l) => s + counts[l] * (RISK_RANK[l] + 1), 0);
}

export interface TimelineEvent {
  at: string;
  title: string;
  kind: ThreatKind;
  riskLevel: RiskLevel;
  acknowledged: boolean;
}

/** Cross-threat timeline, newest first. */
export function threatTimeline(threats: Threat[]): TimelineEvent[] {
  return [...threats]
    .sort((a, b) => b.detectedAt.localeCompare(a.detectedAt))
    .map((t) => ({ at: t.detectedAt, title: t.title, kind: t.kind, riskLevel: t.riskLevel, acknowledged: t.acknowledged }));
}

export interface ExposureBar {
  category: ExposureCategory;
  count: number;
  highest: RiskLevel;
}

/** Exposure-by-category graph (bars), most-exposed first. */
export function exposureGraph(exposures: Exposure[]): ExposureBar[] {
  const byCat = new Map<ExposureCategory, Exposure[]>();
  for (const e of exposures) {
    const list = byCat.get(e.category) ?? [];
    list.push(e);
    byCat.set(e.category, list);
  }
  return [...byCat.entries()]
    .map(([category, es]) => ({
      category,
      count: es.length,
      highest: es.reduce<RiskLevel>((a, e) => (RISK_RANK[e.riskLevel] > RISK_RANK[a] ? e.riskLevel : a), "low"),
    }))
    .sort((a, b) => b.count - a.count);
}
