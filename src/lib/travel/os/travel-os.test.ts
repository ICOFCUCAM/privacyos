import { describe, it, expect } from "vitest";
import {
  tripPhase, tripRegistry, destinationIntel, travelReadiness, travelOverview,
} from "./travel-os";
import type { TravelAssessment, TravelMeasure, TravelPosture } from "@/lib/intelligence/travel-risk";
import type { TravelAlert } from "@/lib/suite-types";

const measure = (priority: TravelMeasure["priority"]): TravelMeasure => ({ task: "t", rationale: "r", priority });

const trip = (over: Partial<TravelAssessment> & { destination?: string }): TravelAssessment => {
  const { destination = "London, UK", ...rest } = over;
  const alert: TravelAlert = { id: Math.random().toString(36).slice(2), subjectId: "s", destination, riskLevel: "medium", advisory: `Advisory for ${destination}` };
  return {
    alert, daysUntil: 5, upcoming: true, riskScore: 40, posture: "guarded" as TravelPosture, factors: [], measures: [], ...rest,
  };
};

describe("trip registry", () => {
  it("phases trips by days-until", () => {
    expect(tripPhase(trip({ daysUntil: 0 }))).toBe("active");
    expect(tripPhase(trip({ daysUntil: 10 }))).toBe("upcoming");
    expect(tripPhase(trip({ daysUntil: -3 }))).toBe("completed");
    expect(tripPhase(trip({ daysUntil: null }))).toBe("undated");
  });
  it("groups non-empty phases in order, worst-risk first within a phase", () => {
    const reg = tripRegistry([
      trip({ daysUntil: 10, riskScore: 30 }),
      trip({ daysUntil: 10, riskScore: 70 }),
      trip({ daysUntil: -5 }),
    ]);
    expect(reg.map((g) => g.phase)).toEqual(["upcoming", "completed"]);
    expect(reg[0].trips[0].riskScore).toBe(70); // worst first
  });
});

describe("destination intelligence", () => {
  it("aggregates by destination, worst posture first, with next departure", () => {
    const intel = destinationIntel([
      trip({ destination: "Bogotá, CO", posture: "high", riskScore: 80, daysUntil: 12 }),
      trip({ destination: "Bogotá, CO", posture: "elevated", riskScore: 55, daysUntil: 3 }),
      trip({ destination: "London, UK", posture: "low", riskScore: 15, daysUntil: 20 }),
    ]);
    expect(intel[0].destination).toBe("Bogotá, CO"); // worst posture first
    expect(intel[0].trips).toBe(2);
    expect(intel[0].highestRisk).toBe(80);
    expect(intel[0].nextDays).toBe(3); // soonest upcoming
  });
});

describe("pre-travel readiness", () => {
  it("falls as critical/high measures pile up on upcoming trips", () => {
    const clear = travelReadiness([trip({ daysUntil: 5, measures: [measure("standard")] })]);
    expect(clear.readiness).toBeGreaterThan(80);
    const loaded = travelReadiness([trip({ daysUntil: 5, measures: [measure("critical"), measure("critical"), measure("high")] })]);
    expect(loaded.criticalMeasures).toBe(2);
    expect(loaded.readiness).toBeLessThan(clear.readiness);
    // no upcoming trips → fully ready
    expect(travelReadiness([trip({ daysUntil: -2 })]).readiness).toBe(100);
  });
});

describe("travelOverview", () => {
  it("rolls up trips, upcoming, destinations, highest posture, mean risk", () => {
    const o = travelOverview([
      trip({ destination: "A", posture: "high", riskScore: 80, upcoming: true }),
      trip({ destination: "B", posture: "low", riskScore: 20, upcoming: false }),
    ]);
    expect(o).toMatchObject({ trips: 2, upcoming: 1, destinations: 2, highestPosture: "high", meanRisk: 50 });
  });
  it("is zero/low for no trips", () => {
    expect(travelOverview([])).toMatchObject({ trips: 0, upcoming: 0, highestPosture: "low", meanRisk: 0 });
  });
});
