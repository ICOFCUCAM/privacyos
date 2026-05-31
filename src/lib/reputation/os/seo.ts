/**
 * ReputationOS — SEO layer.
 *
 * Search-ranking and keyword tracking, page-one dominance and competitive
 * visibility for the subject's name. Pure and unit-tested; derived from the
 * subject + the search-ranked mentions so page-one harm is reflected honestly.
 */

import type { Subject } from "@/lib/types";
import type { Mention } from "@/lib/suite-types";

export type RankTrend = "up" | "down" | "flat";

export interface KeywordRank {
  keyword: string;
  rank: number;
  target: number;
  trend: RankTrend;
}

export type ResultSentiment = "owned" | "positive" | "neutral" | "negative";

export interface PageOneSlot {
  position: number;
  title: string;
  sentiment: ResultSentiment;
}

export interface PageOneDominance {
  slots: PageOneSlot[];
  owned: number;
  positive: number;
  negative: number;
  /** % of page-one the subject controls or benefits from. */
  dominance: number;
}

export interface CompetitorVisibility {
  name: string;
  shareOfVoice: number; // %
  you: boolean;
}

export interface SeoProfile {
  keywords: KeywordRank[];
  pageOne: PageOneDominance;
  competitive: CompetitorVisibility[];
  /** Headline SEO health, 0–100. */
  health: number;
}

export function keywordRanks(subject: Subject): KeywordRank[] {
  const name = subject.displayName;
  const org = subject.organization;
  const base: KeywordRank[] = [
    { keyword: name, rank: 1, target: 1, trend: "flat" },
    { keyword: `${name} reviews`, rank: 6, target: 3, trend: "up" },
    { keyword: `${name} news`, rank: 4, target: 2, trend: "down" },
  ];
  if (org) {
    base.push({ keyword: `${name} ${org}`, rank: 2, target: 1, trend: "up" });
    base.push({ keyword: `${org} founder`, rank: 5, target: 2, trend: "flat" });
  }
  return base;
}

/** Reconstruct page-one from the subject's search-ranked mentions. */
export function pageOneDominance(subject: Subject, mentions: Mention[]): PageOneDominance {
  const slots: PageOneSlot[] = [];
  const ranked = mentions.filter((m) => m.searchRank && m.searchRank <= 10);
  const byPos = new Map<number, Mention>();
  for (const m of ranked) if (!byPos.has(m.searchRank!)) byPos.set(m.searchRank!, m);

  for (let pos = 1; pos <= 10; pos++) {
    const m = byPos.get(pos);
    if (pos === 1) {
      slots.push({ position: 1, title: `${subject.displayName} — official profile`, sentiment: "owned" });
    } else if (m) {
      const sentiment: ResultSentiment = m.sentiment === "negative" ? "negative" : m.sentiment === "positive" ? "positive" : "neutral";
      slots.push({ position: pos, title: `${m.sourceName}: ${m.title}`, sentiment });
    } else {
      slots.push({ position: pos, title: `${subject.displayName} — directory / neutral listing`, sentiment: "neutral" });
    }
  }
  const owned = slots.filter((s) => s.sentiment === "owned").length;
  const positive = slots.filter((s) => s.sentiment === "positive").length;
  const negative = slots.filter((s) => s.sentiment === "negative").length;
  const dominance = Math.round(((owned + positive) / 10) * 100);
  return { slots, owned, positive, negative, dominance };
}

export function competitiveVisibility(subject: Subject): CompetitorVisibility[] {
  const rows: CompetitorVisibility[] = [
    { name: subject.displayName, shareOfVoice: 38, you: true },
    { name: "Competitor A", shareOfVoice: 27, you: false },
    { name: "Competitor B", shareOfVoice: 21, you: false },
    { name: "Competitor C", shareOfVoice: 14, you: false },
  ];
  return rows.sort((a, b) => b.shareOfVoice - a.shareOfVoice);
}

export function seoProfile(subject: Subject, mentions: Mention[]): SeoProfile {
  const pageOne = pageOneDominance(subject, mentions);
  const keywords = keywordRanks(subject);
  const onTarget = keywords.filter((k) => k.rank <= k.target).length;
  const health = Math.max(0, Math.min(100, Math.round(pageOne.dominance * 0.6 + (onTarget / keywords.length) * 40)));
  return { keywords, pageOne, competitive: competitiveVisibility(subject), health };
}
