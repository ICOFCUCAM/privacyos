import { describe, it, expect } from "vitest";
import { caseFromMention, reputationCasesFromMentions, shouldOpenReputationCase, type ReputationMentionLike } from "./reputation-cases";

const m = (over: Partial<ReputationMentionLike>): ReputationMentionLike => ({
  title: "Story", sourceName: "news.com", sentiment: "negative", sentimentScore: -0.7, isDefamatory: false, ...over,
});

describe("shouldOpenReputationCase", () => {
  it("opens for defamatory or strongly-negative coverage only", () => {
    expect(shouldOpenReputationCase(m({ isDefamatory: true, sentiment: "neutral", sentimentScore: 0 }))).toBe(true);
    expect(shouldOpenReputationCase(m({ sentiment: "negative", sentimentScore: -0.7 }))).toBe(true);
    expect(shouldOpenReputationCase(m({ sentiment: "negative", sentimentScore: -0.3 }))).toBe(false);
    expect(shouldOpenReputationCase(m({ sentiment: "positive", sentimentScore: 0.8 }))).toBe(false);
  });
});

describe("caseFromMention", () => {
  it("routes to a reputation-recovery case for the Reputation Agent with an attached plan", () => {
    const c = caseFromMention(m({ isDefamatory: true }));
    expect(c.type).toBe("reputation_recovery");
    expect(c.assignedAgent).toBe("reputation");
    expect(c.title).toMatch(/Defamatory content/);
    expect(c.summary).toMatch(/takedown/i);
    expect(c.summary).toMatch(/Recovery plan/); // generated plan attached
    expect(c.summary).toMatch(/1\./); // numbered steps
  });
  it("escalates defamatory page-one results to critical", () => {
    expect(caseFromMention(m({ isDefamatory: true, searchRank: 2 })).riskLevel).toBe("critical");
    expect(caseFromMention(m({ isDefamatory: true, searchRank: 8 })).riskLevel).toBe("high");
  });
});

describe("reputationCasesFromMentions", () => {
  it("opens cases for qualifying mentions, deduped against open titles", () => {
    const cases = reputationCasesFromMentions(
      [
        m({ title: "A", isDefamatory: true }),
        m({ title: "A", isDefamatory: true }),          // dup within batch
        m({ title: "B", sentiment: "positive", sentimentScore: 0.9 }), // excluded
        m({ title: "C", sentiment: "negative", sentimentScore: -0.9 }),
      ],
      ["Defamatory content: A"], // already open
    );
    expect(cases.map((c) => c.title)).toEqual(["Negative coverage: C"]);
  });
});
