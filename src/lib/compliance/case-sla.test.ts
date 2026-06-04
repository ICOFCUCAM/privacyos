import { describe, it, expect } from "vitest";
import { caseSla, caseSlaReport, RESPONSE_SLA_HOURS } from "./case-sla";
import type { Case } from "@/lib/types";

const HOUR = 3_600_000;
const NOW = Date.parse("2026-06-01T00:00:00Z");

const kase = (over: Partial<Case>): Case => ({
  id: "c1", subjectId: "s", type: "breach_response", title: "Case", summary: "", status: "open",
  riskLevel: "high", assignedAgent: "security", relatedExposureIds: [], createdAt: "", updatedAt: "", ...over,
});

const ago = (hours: number) => new Date(NOW - hours * HOUR).toISOString();

describe("caseSla", () => {
  it("returns null when the clock isn't running (resolved/escalated)", () => {
    expect(caseSla(kase({ status: "resolved", createdAt: ago(1) }), NOW)).toBeNull();
    expect(caseSla(kase({ status: "escalated", createdAt: ago(1) }), NOW)).toBeNull();
  });

  it("breaches a critical case past its 24h deadline", () => {
    const s = caseSla(kase({ riskLevel: "critical", createdAt: ago(48) }), NOW)!;
    expect(s.status).toBe("breached");
    expect(s.hoursRemaining).toBeLessThan(0);
  });

  it("flags at-risk inside the final quarter of the window", () => {
    // high = 72h window; opened 60h ago → 12h left = 16.7% of window → at_risk.
    const s = caseSla(kase({ riskLevel: "high", createdAt: ago(60) }), NOW)!;
    expect(s.status).toBe("at_risk");
  });

  it("is on track early in the window", () => {
    const s = caseSla(kase({ riskLevel: "high", createdAt: ago(2) }), NOW)!;
    expect(s.status).toBe("on_track");
    expect(s.hoursRemaining).toBeGreaterThan(0);
  });

  it("derives the deadline from the risk-based target", () => {
    const s = caseSla(kase({ riskLevel: "low", createdAt: ago(0) }), NOW)!;
    expect(Date.parse(s.dueAt) - NOW).toBe(RESPONSE_SLA_HOURS.low * HOUR);
  });
});

describe("caseSlaReport", () => {
  it("rolls up counts and attainment, worst first", () => {
    const r = caseSlaReport([
      kase({ id: "a", riskLevel: "critical", createdAt: ago(48) }), // breached
      kase({ id: "b", riskLevel: "high", createdAt: ago(60) }),     // at_risk
      kase({ id: "c", riskLevel: "high", createdAt: ago(1) }),      // on_track
      kase({ id: "d", status: "resolved", createdAt: ago(1) }),     // excluded
    ], NOW);
    expect(r.items).toHaveLength(3);
    expect(r.breached).toBe(1);
    expect(r.atRisk).toBe(1);
    expect(r.onTrack).toBe(1);
    expect(r.items[0].id).toBe("a"); // most overdue first
    expect(r.attainment).toBe(67); // 2 of 3 not breached
  });

  it("is 100% attainment when no clocks are running", () => {
    expect(caseSlaReport([], NOW).attainment).toBe(100);
  });
});
