import { describe, it, expect } from "vitest";
import { analysisScores, monitoringCoverage, reputationOverview } from "./analysis";
import { growthProgram, executiveVisibility, contentCalendar } from "./growth";
import { seoProfile, pageOneDominance, ownedRankFrom, withLiveNameRank } from "./seo";
import { mediaProgram, generatePressRelease } from "./media";
import { recoveryProgram, crisisPlan, suppressionPlan } from "./recovery";
import { socialStrategies } from "./social";
import { discoverOpportunities, summarizeOpportunities } from "./intelligence";
import { generateAllCampaigns, generateRecoveryPlan, generatePRPlan } from "./campaigns";
import type { Subject } from "@/lib/types";
import type { Mention } from "@/lib/suite-types";

const subject: Subject = {
  id: "s", type: "individual", displayName: "Jordan Vance", emails: [], phones: [], usernames: [],
  organization: "Vance Capital", createdAt: "2026-01-01T00:00:00Z",
};

const mention = (over: Partial<Mention>): Mention => ({
  id: Math.random().toString(36).slice(2), subjectId: "s", channel: "news", sourceName: "TechCrunch",
  title: "Headline", excerpt: "x", sentiment: "neutral", sentimentScore: 0, isDefamatory: false,
  detectedAt: new Date().toISOString(), ...over,
});

const negative = mention({ sentiment: "negative", sentimentScore: -0.7, searchRank: 2, sourceName: "Reddit r/x", channel: "forum" });
const defam = mention({ sentiment: "negative", sentimentScore: -0.6, isDefamatory: true, searchRank: 5 });
const positive = mention({ sentiment: "positive", sentimentScore: 0.8, searchRank: 4, sourceName: "Bloomberg" });
const profile = [negative, defam, positive, mention({ channel: "social", sentiment: "negative", sentimentScore: -0.5 })];

describe("analysis", () => {
  it("scores five axes within 0–100", () => {
    const s = analysisScores(profile);
    for (const v of Object.values(s)) expect(v).toBeGreaterThanOrEqual(0), expect(v).toBeLessThanOrEqual(100);
  });
  it("a clean positive profile beats a negative one on brand perception", () => {
    const good = analysisScores([positive, mention({ sentiment: "positive", sentimentScore: 0.6 })]);
    const bad = analysisScores([negative, defam]);
    expect(good.brandPerception).toBeGreaterThan(bad.brandPerception);
  });
  it("covers all eight monitoring channels and buckets reddit/news", () => {
    const cov = monitoringCoverage(profile);
    expect(cov).toHaveLength(8);
    expect(cov.find((c) => c.channel === "reddit")!.mentions).toBe(1);
    expect(cov.find((c) => c.channel === "news")!.mentions).toBeGreaterThanOrEqual(1);
  });
  it("overview reports health + counts", () => {
    const o = reputationOverview(profile);
    expect(o.channelsMonitored).toBe(8);
    expect(o.negatives).toBe(3);
    expect(o.defamation).toBe(1);
  });
});

describe("growth", () => {
  it("prioritizes credibility content when sentiment is soft", () => {
    const prog = growthProgram(subject, [negative, defam]);
    expect(prog.recommendations[0].impact).toBeGreaterThanOrEqual(80);
    expect(prog.calendar.length).toBeGreaterThan(0);
    expect(prog.pillars.length).toBe(4);
  });
  it("executive visibility flags gaps and a trajectory", () => {
    const v = executiveVisibility([]);
    expect(["rising", "steady", "declining"]).toContain(v.trajectory);
    expect(v.gaps.length).toBeGreaterThan(0);
  });
  it("calendar entries fall within the window", () => {
    const cal = contentCalendar(subject, 14);
    expect(cal.every((e) => e.day >= 1 && e.day <= 14)).toBe(true);
  });
});

describe("seo", () => {
  it("reconstructs page one with position 1 owned and counts dominance", () => {
    const p = pageOneDominance(subject, profile);
    expect(p.slots).toHaveLength(10);
    expect(p.slots[0].sentiment).toBe("owned");
    expect(p.negative).toBeGreaterThanOrEqual(1);
    expect(p.dominance).toBeGreaterThanOrEqual(0);
  });
  it("seoProfile yields keywords + health", () => {
    const s = seoProfile(subject, profile);
    expect(s.keywords.length).toBeGreaterThan(0);
    expect(s.competitive.find((c) => c.you)).toBeTruthy();
  });
  it("feeds the live owned position into the own-name keyword only", () => {
    const pageOne = pageOneDominance(subject, profile);
    const owned = ownedRankFrom(pageOne);
    expect(owned).toBe(1); // position 1 is the owned profile
    const keywords = withLiveNameRank(seoProfile(subject, profile).keywords, subject.displayName, owned);
    const name = keywords.find((k) => k.keyword === subject.displayName)!;
    expect(name.rank).toBe(1);
    expect(name.liveRank).toBe(true);
    // other keywords stay modeled (no live flag)
    expect(keywords.filter((k) => k.liveRank).length).toBe(1);
  });
  it("withLiveNameRank is a no-op when there's no owned position", () => {
    const ks = seoProfile(subject, profile).keywords;
    expect(withLiveNameRank(ks, subject.displayName, null)).toEqual(ks);
  });
});

describe("media", () => {
  it("generates a press release using the strongest positive signal", () => {
    const r = generatePressRelease(subject, profile);
    expect(r.headline).toContain("Vance Capital");
    expect(r.body.join(" ")).toContain("Bloomberg");
  });
  it("ranks opportunities + journalists by fit/relevance", () => {
    const m = mediaProgram(subject, profile);
    expect(m.opportunities[0].fit).toBeGreaterThanOrEqual(m.opportunities[1].fit);
    expect(m.journalists[0].relevance).toBeGreaterThanOrEqual(m.journalists[1].relevance);
  });
});

describe("recovery", () => {
  it("orders suppression targets by current rank and tailors defamation tactics", () => {
    const t = suppressionPlan(profile);
    expect(t[0].currentRank).toBe(2);
    const d = t.find((x) => x.defamatory)!;
    expect(d.tactics.join(" ")).toMatch(/takedown|de-index/i);
  });
  it("escalates the crisis tier on defamation", () => {
    expect(crisisPlan([defam]).tier).toBe("full_response");
    expect(crisisPlan([positive]).tier).toBe("monitor");
  });
  it("uses a real live SERP position when one is available", () => {
    const neg = mention({ sentiment: "negative", sentimentScore: -0.7, url: "https://bad.com/story", searchRank: 8 });
    const serp = [{ position: 3, title: "x", url: "https://bad.com/story", domain: "bad.com" }];
    const [t] = suppressionPlan([neg], serp);
    expect(t.currentRank).toBe(3); // live position overrides modeled rank 8
    expect(t.liveRank).toBe(true);
    expect(t.projectedRank).toBe(9); // 3 + 6
  });
  it("falls back to the modeled rank without live SERP data", () => {
    const [t] = suppressionPlan([negative]);
    expect(t.liveRank).toBe(false);
  });
  it("recoveryProgram bundles suppression + repair + crisis", () => {
    const r = recoveryProgram(profile);
    expect(r.suppression.length).toBeGreaterThan(0);
    expect(r.repair.length).toBe(5);
  });
});

describe("social + intelligence", () => {
  it("returns five platform strategies, high priority first", () => {
    const s = socialStrategies([]);
    expect(s).toHaveLength(5);
    expect(s[0].priority).toBe("high");
  });
  it("discovers and summarizes opportunities", () => {
    const ops = discoverOpportunities(subject);
    const sum = summarizeOpportunities(ops);
    expect(sum.total).toBe(ops.length);
    expect(sum.topFit).toBe(ops[0].fit);
  });
});

describe("campaigns", () => {
  it("auto-generates growth, pr and recovery campaigns", () => {
    const all = generateAllCampaigns(subject, profile);
    expect(all.map((c) => c.kind)).toEqual(["growth", "pr", "recovery"]);
    expect(all.every((c) => c.steps.length > 0 && c.projectedLift > 0)).toBe(true);
  });
  it("recovery plan files takedowns when defamation is present", () => {
    const plan = generateRecoveryPlan(subject, [defam]);
    expect(plan.steps.find((s) => s.phase === "Legal")!.action).toMatch(/takedown/i);
  });
  it("PR plan pitches a real covering outlet when coverage exists", () => {
    const covered = mention({ sourceName: "Reuters", channel: "news", sentiment: "positive", sentimentScore: 0.6 });
    const pitch = generatePRPlan(subject, [covered]).steps.find((s) => s.phase === "Pitch")!;
    expect(pitch.action).toContain("Reuters");
    expect(pitch.action).toMatch(/recent coverage/i);
    // falls back to a curated outlet with no coverage
    expect(generatePRPlan(subject, []).steps.find((s) => s.phase === "Pitch")!.action).not.toContain("Reuters");
  });
});
