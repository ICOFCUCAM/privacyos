import { describe, it, expect } from "vitest";
import { freeAssessment, FREE_INCLUDES, LOCKED_FEATURES, FREE_REMOVALS } from "./free-assessment";
import { buildScaryMirror } from "./scary-mirror";
import type { Exposure, Threat, ExposureSource } from "@/lib/types";

const exposure = (source: ExposureSource, sourceName: string, over: Partial<Exposure> = {}): Exposure => ({
  id: Math.random().toString(36).slice(2), subjectId: "s1", category: "address", source, sourceName,
  snippet: "", riskLevel: "high", riskScore: 10, status: "monitoring",
  discoveredAt: "2026-01-01T00:00:00Z", lastSeenAt: "2026-01-01T00:00:00Z", ...over,
});
const threat = (kind: Threat["kind"], over: Partial<Threat> = {}): Threat => ({
  id: Math.random().toString(36).slice(2), subjectId: "s1", kind, title: "t", detail: "",
  riskLevel: "high", source: "dark_web", detectedAt: "2026-01-01T00:00:00Z", acknowledged: false, ...over,
});

describe("free exposure assessment", () => {
  const report = buildScaryMirror({
    name: "Jordan",
    exposures: [
      exposure("data_broker", "Spokeo"),
      exposure("data_broker", "Whitepages"),
      exposure("social_media", "Old profile"),
      { ...exposure("breach_db", "BankLeak"), category: "financial", riskLevel: "critical" },
    ],
    threats: [threat("credential_leak"), threat("negative_press")],
  });

  it("turns the scary window into a category breakdown + protection score", () => {
    const a = freeAssessment(report);
    expect(a.totalExposures).toBe(report.totalFindings);
    expect(a.protectionScore).toBe(report.protectionScore);
    expect(a.breakdown.length).toBe(report.findings.length);
    // customer-facing labels, with counts
    const brokers = a.breakdown.find((r) => r.category === "brokers")!;
    expect(brokers.label).toBe("Data broker listings");
    expect(brokers.count).toBe(2);
    expect(a.breakdown.some((r) => r.category === "financial")).toBe(true);
  });

  it("frames the free value and the locked plan capabilities", () => {
    const a = freeAssessment(report);
    expect(a.freeIncludes).toEqual(FREE_INCLUDES);
    expect(a.freeRemovals).toBe(FREE_REMOVALS);
    expect(a.freeIncludes.some((s) => /10 broker removals/i.test(s))).toBe(true);
    // everything that drives protection is locked
    for (const f of ["Dark Web Monitoring", "Continuous Monitoring", "AI Agents", "Real-Time Alerts"]) {
      expect(a.lockedFeatures).toContain(f);
    }
    expect(LOCKED_FEATURES).not.toContain("Exposure report"); // the report is free
  });
});
