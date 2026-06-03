import { describe, it, expect } from "vitest";
import { assessTrip, assessTrips, summarizeTravel } from "./travel-risk";
import type { Exposure, Threat } from "@/lib/types";
import type { TravelAlert } from "@/lib/suite-types";

const NOW = new Date("2026-05-31T00:00:00Z").getTime();
const inDays = (d: number) => new Date(NOW + d * 86_400_000).toISOString().slice(0, 10);

const alert = (over: Partial<TravelAlert>): TravelAlert => ({
  id: "t1", subjectId: "s", destination: "Mexico City, MX", travelDate: inDays(10),
  riskLevel: "medium", advisory: "Elevated risk.", ...over,
});

const threat = (over: Partial<Threat>): Threat => ({
  id: Math.random().toString(36).slice(2), subjectId: "s", kind: "location_exposure", title: "T", detail: "",
  riskLevel: "high", source: "social_media", detectedAt: "", acknowledged: false, ...over,
});

const exposure = (over: Partial<Exposure>): Exposure => ({
  id: Math.random().toString(36).slice(2), subjectId: "s", category: "address", source: "data_broker",
  sourceName: "Spokeo", snippet: "", riskLevel: "high", riskScore: 20, status: "discovered",
  discoveredAt: "", lastSeenAt: "", ...over,
});

describe("assessTrip", () => {
  it("computes days-until and upcoming flag", () => {
    expect(assessTrip(alert({ travelDate: inDays(10) }), [], [], NOW).daysUntil).toBe(10);
    expect(assessTrip(alert({ travelDate: inDays(-3) }), [], [], NOW).upcoming).toBe(false);
    expect(assessTrip(alert({ travelDate: undefined }), [], [], NOW).daysUntil).toBeNull();
  });

  it("always includes the destination advisory as a factor", () => {
    const a = assessTrip(alert({}), [], [], NOW);
    expect(a.factors[0].label).toBe("Destination advisory");
  });

  it("raises the score and adds factors from the principal's profile", () => {
    const base = assessTrip(alert({}), [], [], NOW).riskScore;
    const correlated = assessTrip(
      alert({}),
      [exposure({ category: "address" })],
      [threat({ kind: "location_exposure", riskLevel: "high" }), threat({ kind: "credential_leak", riskLevel: "high" })],
      NOW,
    );
    expect(correlated.riskScore).toBeGreaterThan(base);
    expect(correlated.factors.map((f) => f.label)).toEqual(
      expect.arrayContaining(["Location exposure", "Residence exposed", "Credential exposure"]),
    );
  });

  it("produces prioritized measures, critical first", () => {
    const a = assessTrip(alert({ riskLevel: "high" }), [exposure({})], [threat({ kind: "location_exposure" })], NOW);
    expect(a.measures.length).toBeGreaterThan(1);
    expect(a.measures[0].priority).toBe("critical");
  });

  it("ignores acknowledged threats", () => {
    const a = assessTrip(alert({}), [], [threat({ acknowledged: true })], NOW);
    expect(a.factors.some((f) => f.label === "Location exposure")).toBe(false);
  });
});

describe("assessTrips + summary", () => {
  it("orders upcoming-soonest first and summarizes", () => {
    const trips = assessTrips(
      [
        alert({ id: "past", travelDate: inDays(-5) }),
        alert({ id: "soon", travelDate: inDays(3) }),
        alert({ id: "later", travelDate: inDays(20) }),
      ],
      [], [], NOW,
    );
    expect(trips[0].alert.id).toBe("soon");
    expect(trips[trips.length - 1].alert.id).toBe("past");

    const s = summarizeTravel(trips);
    expect(s.trips).toBe(3);
    expect(s.upcoming).toBe(2);
    expect(s.next?.alert.id).toBe("soon");
  });
});
