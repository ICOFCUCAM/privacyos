/**
 * Travel Security OS engine.
 *
 * Builds on the per-trip risk assessment (`intelligence/travel-risk.ts`) with
 * the module-level views: a phased trip registry, per-destination intelligence,
 * and pre-travel readiness. Pure and unit-tested.
 */

import type { TravelAssessment, TravelPosture } from "@/lib/intelligence/travel-risk";

const POSTURE_RANK: Record<TravelPosture, number> = { low: 0, guarded: 1, elevated: 2, high: 3 };

/* ── Trip registry ───────────────────────────────────────────────────────── */

export type TripPhase = "active" | "upcoming" | "completed" | "undated";

export const PHASE_LABEL: Record<TripPhase, string> = {
  active: "In progress", upcoming: "Upcoming", completed: "Completed", undated: "Unscheduled",
};

const PHASE_ORDER: TripPhase[] = ["active", "upcoming", "undated", "completed"];

export function tripPhase(a: TravelAssessment): TripPhase {
  if (a.daysUntil == null) return "undated";
  if (a.daysUntil === 0) return "active";
  return a.daysUntil > 0 ? "upcoming" : "completed";
}

export interface TripGroup {
  phase: TripPhase;
  label: string;
  trips: TravelAssessment[];
}

/** Group trips by phase (non-empty, ordered active → upcoming → undated → completed). */
export function tripRegistry(assessments: TravelAssessment[]): TripGroup[] {
  return PHASE_ORDER
    .map((phase) => ({
      phase,
      label: PHASE_LABEL[phase],
      trips: assessments.filter((a) => tripPhase(a) === phase).sort((x, y) => y.riskScore - x.riskScore),
    }))
    .filter((g) => g.trips.length > 0);
}

/* ── Destination intelligence ────────────────────────────────────────────── */

export interface DestinationIntel {
  destination: string;
  trips: number;
  highestRisk: number;
  posture: TravelPosture;
  advisory: string;
  /** Days until the next departure to this destination, or null. */
  nextDays: number | null;
}

/** Aggregate trips by destination, worst posture first. */
export function destinationIntel(assessments: TravelAssessment[]): DestinationIntel[] {
  const byDest = new Map<string, TravelAssessment[]>();
  for (const a of assessments) {
    const list = byDest.get(a.alert.destination) ?? [];
    list.push(a);
    byDest.set(a.alert.destination, list);
  }
  return [...byDest.entries()]
    .map(([destination, list]) => {
      const worst = list.reduce((m, a) => (a.riskScore > m.riskScore ? a : m), list[0]);
      const upcoming = list.filter((a) => a.daysUntil != null && a.daysUntil >= 0).map((a) => a.daysUntil as number);
      return {
        destination,
        trips: list.length,
        highestRisk: worst.riskScore,
        posture: worst.posture,
        advisory: worst.alert.advisory,
        nextDays: upcoming.length ? Math.min(...upcoming) : null,
      };
    })
    .sort((a, b) => POSTURE_RANK[b.posture] - POSTURE_RANK[a.posture] || b.highestRisk - a.highestRisk);
}

/* ── Pre-travel readiness ────────────────────────────────────────────────── */

export interface TravelReadiness {
  upcomingTrips: number;
  measures: number;
  criticalMeasures: number;
  highMeasures: number;
  /** 0–100 readiness (higher = better prepared); falls as critical measures pile up. */
  readiness: number;
}

/** Readiness across upcoming/active trips, from outstanding protective measures. */
export function travelReadiness(assessments: TravelAssessment[]): TravelReadiness {
  const upcoming = assessments.filter((a) => tripPhase(a) === "upcoming" || tripPhase(a) === "active");
  const measures = upcoming.flatMap((a) => a.measures);
  const criticalMeasures = measures.filter((m) => m.priority === "critical").length;
  const highMeasures = measures.filter((m) => m.priority === "high").length;
  const readiness = upcoming.length === 0 ? 100 : Math.max(0, Math.min(100, 100 - criticalMeasures * 18 - highMeasures * 9));
  return { upcomingTrips: upcoming.length, measures: measures.length, criticalMeasures, highMeasures, readiness };
}

/* ── Roll-up ─────────────────────────────────────────────────────────────── */

export interface TravelOverview {
  trips: number;
  upcoming: number;
  destinations: number;
  highestPosture: TravelPosture;
  meanRisk: number;
}

export function travelOverview(assessments: TravelAssessment[]): TravelOverview {
  const upcoming = assessments.filter((a) => a.upcoming).length;
  const destinations = new Set(assessments.map((a) => a.alert.destination)).size;
  const highestPosture = assessments.reduce<TravelPosture>((p, a) => (POSTURE_RANK[a.posture] > POSTURE_RANK[p] ? a.posture : p), "low");
  const meanRisk = assessments.length ? Math.round(assessments.reduce((s, a) => s + a.riskScore, 0) / assessments.length) : 0;
  return { trips: assessments.length, upcoming, destinations, highestPosture, meanRisk };
}
