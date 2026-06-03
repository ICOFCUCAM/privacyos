import { describe, it, expect } from "vitest";
import { computeRiskScore } from "@/lib/scoring/risk-score";
import { buildScaryMirror } from "./scary-mirror";
import { buildProtectionHome } from "./protection-home";
import type { Exposure, Threat } from "@/lib/types";

const exposures: Exposure[] = [
  { id: "e1", subjectId: "s1", category: "address", source: "data_broker", sourceName: "Spokeo", snippet: "",
    riskLevel: "high", riskScore: 30, status: "monitoring", discoveredAt: "2026-01-01T00:00:00Z", lastSeenAt: "2026-01-01T00:00:00Z" },
  { id: "e2", subjectId: "s1", category: "credential", source: "breach_db", sourceName: "LinkedIn", snippet: "",
    riskLevel: "critical", riskScore: 50, status: "monitoring", discoveredAt: "2026-01-01T00:00:00Z", lastSeenAt: "2026-01-01T00:00:00Z" },
];
const threats: Threat[] = [
  { id: "t1", subjectId: "s1", kind: "doxxing", title: "Address posted", detail: "", riskLevel: "high",
    source: "dark_web", detectedAt: "2026-01-02T00:00:00Z", acknowledged: false },
];

describe("score consistency across surfaces", () => {
  it("the Scary Mirror and Protection Home agree on the same dataset", () => {
    const riskScore = computeRiskScore(exposures, threats);
    const mirror = buildScaryMirror({ name: "Jordan", exposures, threats });
    const home = buildProtectionHome({
      riskScore, exposures: { length: exposures.length }, threats, recommendations: [], removals: [], workflows: [],
    });

    // the mirror derives its exposure score from the same canonical model
    expect(mirror.exposureScore).toBe(riskScore.overall);
    // protection is the strict inverse on both surfaces
    expect(home.protectionScore).toBe(100 - riskScore.overall);
    expect(mirror.protectionScore).toBe(home.protectionScore);
  });

  it("a clean footprint reads as fully protected on both", () => {
    const riskScore = computeRiskScore([], []);
    const mirror = buildScaryMirror({ name: "Sam", exposures: [], threats: [] });
    const home = buildProtectionHome({
      riskScore, exposures: { length: 0 }, threats: [], recommendations: [], removals: [], workflows: [],
    });
    expect(mirror.protectionScore).toBe(100);
    expect(home.protectionScore).toBe(100);
  });
});
