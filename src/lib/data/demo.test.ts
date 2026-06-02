import { describe, it, expect } from "vitest";
import {
  demoSubject, demoExposures, demoThreats, demoCases, demoAgents,
  demoRecommendations, demoRiskScore, demoRemovals,
} from "./demo";

describe("demo dataset", () => {
  it("is internally consistent — every record belongs to the demo subject", () => {
    const sid = demoSubject.id;
    for (const e of demoExposures) expect(e.subjectId).toBe(sid);
    for (const t of demoThreats) expect(t.subjectId).toBe(sid);
    for (const c of demoCases) expect(c.subjectId).toBe(sid);
    for (const r of demoRecommendations) expect(r.subjectId).toBe(sid);
    for (const r of demoRemovals) expect(r.subjectId).toBe(sid);
  });

  it("has unique ids within each id-keyed collection", () => {
    for (const coll of [demoExposures, demoThreats, demoCases, demoRecommendations, demoRemovals]) {
      const ids = coll.map((x) => (x as { id: string }).id);
      expect(new Set(ids).size).toBe(ids.length);
    }
    // agents are keyed by kind
    const kinds = demoAgents.map((a) => a.kind);
    expect(new Set(kinds).size).toBe(kinds.length);
  });

  it("produces a populated, in-range risk score", () => {
    expect(demoExposures.length).toBeGreaterThan(0);
    expect(demoThreats.length).toBeGreaterThan(0);
    expect(demoRiskScore.overall).toBeGreaterThanOrEqual(0);
    expect(demoRiskScore.overall).toBeLessThanOrEqual(100);
    expect(demoRiskScore.trend.length).toBeGreaterThan(0);
  });
});
