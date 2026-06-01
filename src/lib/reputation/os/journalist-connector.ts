/**
 * Journalist discovery (Phase 1 — keyless, from real coverage).
 *
 * Derives live media-outreach targets from the news/blog mentions the platform
 * already collects (GDELT). Each outlet that has actually covered the principal
 * becomes a ranked record with the most-recent article as proof. GDELT's article
 * list doesn't expose bylines, so records are outlet-desk level and clearly
 * marked `provider: "coverage"`; a curated list is the fallback. Pure and
 * unit-tested. See docs/reputation-journalist-integration.md for phases 2–3.
 */

import type { Mention } from "@/lib/suite-types";
import type { Journalist } from "./media";

const DAY = 86_400_000;

export interface JournalistRecord extends Journalist {
  /** Where the record came from. */
  provider: "coverage" | "curated";
  /** Proof: a recent article from this outlet about the principal. */
  recentArticleTitle?: string;
  recentArticleUrl?: string;
  recentAt?: string;
}

interface OutletGroup {
  outlet: string;
  mentions: Mention[];
}

function relevanceFor(g: OutletGroup, now: number): number {
  const recentMs = Math.min(...g.mentions.map((m) => now - new Date(m.detectedAt).getTime()));
  const recencyDays = recentMs / DAY;
  const recencyBonus = recencyDays <= 30 ? Math.round((30 - recencyDays) / 2) : 0; // ≤15
  const positives = g.mentions.filter((m) => m.sentiment === "positive").length;
  const negatives = g.mentions.filter((m) => m.sentiment === "negative").length;
  const sentimentBonus = positives > negatives ? 12 : negatives > positives ? -8 : 0;
  const countBonus = Math.min(g.mentions.length, 3) * 3; // ≤9
  return Math.max(0, Math.min(100, 60 + recencyBonus + sentimentBonus + countBonus));
}

/**
 * Build journalist/outlet records from coverage mentions, newest-and-most-
 * relevant first. Considers news + blog channels (the ones with outlets/authors).
 */
export function journalistsFromCoverage(mentions: Mention[], limit = 8, now = Date.now()): JournalistRecord[] {
  const covered = mentions.filter((m) => m.channel === "news" || m.channel === "blog");
  const byOutlet = new Map<string, OutletGroup>();
  for (const m of covered) {
    const key = m.sourceName.toLowerCase();
    const g = byOutlet.get(key) ?? { outlet: m.sourceName, mentions: [] };
    g.mentions.push(m);
    byOutlet.set(key, g);
  }

  return [...byOutlet.values()]
    .map((g) => {
      const latest = [...g.mentions].sort((a, b) => b.detectedAt.localeCompare(a.detectedAt))[0];
      return {
        name: `${g.outlet} — newsroom`,
        outlet: g.outlet,
        beat: g.mentions.some((m) => m.channel === "blog") ? "Commentary" : "News",
        relevance: relevanceFor(g, now),
        provider: "coverage" as const,
        recentArticleTitle: latest.title,
        recentArticleUrl: latest.url,
        recentAt: latest.detectedAt,
      };
    })
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit);
}

/**
 * Live journalists from coverage when available, else the curated fallback
 * (mapped to the same record shape). The `live` flag drives the UI badge.
 */
export function resolveJournalists(
  mentions: Mention[],
  curated: Journalist[],
  limit = 8,
  now = Date.now(),
): { journalists: JournalistRecord[]; live: boolean } {
  const fromCoverage = journalistsFromCoverage(mentions, limit, now);
  if (fromCoverage.length > 0) return { journalists: fromCoverage, live: true };
  return {
    journalists: curated.map((j) => ({ ...j, provider: "curated" as const })),
    live: false,
  };
}
