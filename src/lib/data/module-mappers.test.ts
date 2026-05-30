import { describe, expect, it } from "vitest";
import { buildDomains, mapDomainRisk, mapIncident, mapMention } from "./module-mappers";

describe("module mappers", () => {
  it("maps a mention row, coercing numeric sentiment", () => {
    const m = mapMention({
      id: "1", subject_id: "s", channel: "news", source_name: "X", title: "t",
      excerpt: "e", sentiment: "negative", sentiment_score: "-0.7", search_rank: 2,
      is_defamatory: true, detected_at: "2026-01-01",
    });
    expect(m.sentimentScore).toBe(-0.7);
    expect(m.isDefamatory).toBe(true);
    expect(m.searchRank).toBe(2);
  });

  it("derives incident evidence count from the jsonb array", () => {
    const i = mapIncident({
      id: "1", subject_id: "s", kind: "deepfake", title: "t", risk_level: "critical",
      status: "open", evidence: ["a", "b", "c"], detected_at: "x", updated_at: "y",
    });
    expect(i.evidenceCount).toBe(3);
  });

  it("aggregates domain risk count + highest severity, ignoring resolved", () => {
    const domains = [{ id: "d1", domain: "a.com", is_primary: true }];
    const risks = [
      { id: "r1", domain_id: "d1", risk_level: "medium", resolved: false },
      { id: "r2", domain_id: "d1", risk_level: "high", resolved: false },
      { id: "r3", domain_id: "d1", risk_level: "critical", resolved: true },
    ];
    const [d] = buildDomains(domains, risks);
    expect(d.riskCount).toBe(2);
    expect(d.highestRisk).toBe("high");

    const dr = mapDomainRisk(risks[1], new Map([["d1", "a.com"]]));
    expect(dr.domain).toBe("a.com");
  });
});
