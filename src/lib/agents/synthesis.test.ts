import { describe, it, expect } from "vitest";
import { dedupeKey, synthesizeRecommendations } from "./synthesis";
import type { Recommendation } from "@/lib/types";

const rec = (over: Partial<Recommendation>): Recommendation => ({
  id: Math.random().toString(36).slice(2),
  subjectId: "s1",
  agent: "security",
  title: "Rotate exposed credentials now",
  rationale: "Critical leak.",
  riskLevel: "critical",
  impact: 18,
  actionLabel: "Start breach response",
  ...over,
});

describe("dedupeKey", () => {
  it("normalizes case, punctuation and spacing", () => {
    expect(dedupeKey("Rotate exposed credentials now")).toBe(dedupeKey("ROTATE  exposed-credentials, now!"));
  });
});

describe("synthesizeRecommendations", () => {
  it("merges duplicate titles into one item", () => {
    const out = synthesizeRecommendations([
      rec({ title: "Rotate exposed credentials now" }),
      rec({ title: "Rotate exposed credentials now" }),
      rec({ title: "Rotate exposed credentials now" }),
    ]);
    expect(out.rawCount).toBe(3);
    expect(out.plan).toHaveLength(1);
    expect(out.deduped).toBe(2);
    expect(out.plan[0].mergedCount).toBe(3);
  });

  it("raises confidence when distinct agents corroborate", () => {
    const single = synthesizeRecommendations([rec({ agent: "security" })]).plan[0];
    const corroborated = synthesizeRecommendations([
      rec({ agent: "security" }),
      rec({ agent: "incident" }),
    ]).plan[0];
    expect(corroborated.corroboratingAgents).toHaveLength(2);
    expect(corroborated.confidence).toBeGreaterThan(single.confidence);
  });

  it("does not sum impact for the same issue (uses max + small bonus)", () => {
    const out = synthesizeRecommendations([
      rec({ agent: "security", impact: 18 }),
      rec({ agent: "incident", impact: 18 }),
    ]);
    // max(18) + corroboration bonus, NOT 36
    expect(out.plan[0].impact).toBeGreaterThanOrEqual(18);
    expect(out.plan[0].impact).toBeLessThan(36);
  });

  it("ranks by priority = impact × confidence × risk-weight", () => {
    const out = synthesizeRecommendations([
      rec({ title: "Low thing", riskLevel: "low", impact: 10 }),
      rec({ title: "Critical thing", riskLevel: "critical", impact: 10 }),
    ]);
    expect(out.plan[0].title).toBe("Critical thing"); // critical risk-weight wins
    expect(out.plan[0].priority).toBeGreaterThan(out.plan[1].priority);
  });

  it("repeated identical recs collapse to a single plan item (fixes the dup bug)", () => {
    const dup = Array.from({ length: 6 }, () => rec({ title: "Launch reputation recovery plan", agent: "reputation", impact: 12, riskLevel: "high" }));
    const out = synthesizeRecommendations(dup);
    expect(out.plan).toHaveLength(1);
    expect(out.plan[0].mergedCount).toBe(6);
  });

  it("handles an empty input", () => {
    const out = synthesizeRecommendations([]);
    expect(out.plan).toHaveLength(0);
    expect(out.projectedImpact).toBe(0);
  });
});
