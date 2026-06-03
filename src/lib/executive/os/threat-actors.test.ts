import { describe, it, expect } from "vitest";
import {
  buildThreatActors, isCaseWorthy, actorCaseTitle, actorCasesToOpen,
} from "./threat-actors";
import type { Threat, ThreatKind, RiskLevel, ExposureSource } from "@/lib/types";

const NOW = Date.parse("2026-02-01T00:00:00Z");
const daysAgo = (d: number) => new Date(NOW - d * 86400_000).toISOString();

const threat = (over: Partial<Threat> = {}): Threat => ({
  id: Math.random().toString(36).slice(2), subjectId: "s1", kind: "doxxing" as ThreatKind,
  title: "Targeting", detail: "", riskLevel: "high" as RiskLevel, source: "dark_web" as ExposureSource,
  detectedAt: daysAgo(1), acknowledged: false, ...over,
});

describe("threat actors", () => {
  it("groups threats into actors by source, most-escalated first", () => {
    const actors = buildThreatActors([
      threat({ source: "dark_web", detectedAt: daysAgo(1) }),
      threat({ source: "dark_web", detectedAt: daysAgo(2) }),
      threat({ source: "dark_web", detectedAt: daysAgo(3) }),
      threat({ source: "news", riskLevel: "low", detectedAt: daysAgo(50) }),
    ], NOW);
    expect(actors.length).toBe(2);
    const darkweb = actors.find((a) => a.source === "dark_web")!;
    expect(darkweb.threatCount).toBe(3);
    expect(darkweb.escalation).toBe("active");      // 3 threats within 14 days
    expect(darkweb.harassment).toBe(true);          // doxxing is a harassment kind
    // most-escalated first
    expect(actors[0].source).toBe("dark_web");
  });

  it("excludes acknowledged threats", () => {
    expect(buildThreatActors([threat({ acknowledged: true })], NOW)).toHaveLength(0);
  });

  it("flags case-worthy actors and produces case fields", () => {
    const actors = buildThreatActors([
      threat({ source: "dark_web", riskLevel: "critical", detectedAt: daysAgo(1) }),
      threat({ source: "dark_web", riskLevel: "high", detectedAt: daysAgo(2) }),
      threat({ source: "dark_web", riskLevel: "high", detectedAt: daysAgo(3) }),
    ], NOW);
    const a = actors[0];
    expect(isCaseWorthy(a)).toBe(true);
    expect(actorCaseTitle(a)).toContain(a.label);
    const cases = actorCasesToOpen(actors);
    expect(cases.length).toBeGreaterThan(0);
    // dedupes against already-open titles
    expect(actorCasesToOpen(actors, [actorCaseTitle(a)]).length).toBeLessThan(cases.length);
  });
});
