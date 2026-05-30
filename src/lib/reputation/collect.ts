/**
 * Reputation collection pipeline.
 *
 * Fetches mentions from real sources, computes sentiment on each, dedupes by URL,
 * and returns ready-to-persist `Mention` rows plus the derived daily sentiment
 * series. Pure with respect to its injected source, so it's unit-testable.
 */

import type { Mention, SentimentDay } from "@/lib/suite-types";
import type { Subject } from "@/lib/types";
import { analyzeSentiment } from "./sentiment";
import { NewsMentionSource, type RawMention } from "./news-connector";

const DEFAMATORY_TERMS = ["fraud", "scam", "defamation", "defamatory", "liar", "criminal"];

export interface CollectResult {
  mentions: Omit<Mention, "id" | "subjectId">[];
  sentimentByDay: SentimentDay[];
  live: boolean;
  log: string[];
}

export interface MentionSource {
  fetch(query: string, limit?: number): Promise<{ mentions: RawMention[]; live: boolean }>;
}

/** Turn raw mentions into scored Mention rows + a daily sentiment series. */
export async function collectReputation(
  subject: Pick<Subject, "displayName">,
  source: MentionSource = new NewsMentionSource(),
): Promise<CollectResult> {
  const { mentions: raw, live } = await source.fetch(subject.displayName);

  // Dedupe by URL (or title when URL is absent).
  const seen = new Set<string>();
  const deduped = raw.filter((m) => {
    const key = (m.url ?? m.title).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const mentions = deduped.map((m) => {
    const s = analyzeSentiment(`${m.title} ${m.excerpt}`);
    const lower = `${m.title} ${m.excerpt}`.toLowerCase();
    return {
      channel: m.channel,
      sourceName: m.sourceName,
      url: m.url,
      title: m.title,
      excerpt: m.excerpt,
      sentiment: s.label,
      sentimentScore: s.score,
      isDefamatory: s.label === "negative" && DEFAMATORY_TERMS.some((t) => lower.includes(t)),
      detectedAt: m.detectedAt,
    };
  });

  // Group into a daily sentiment series.
  const byDay = new Map<string, { pos: number; neu: number; neg: number; scores: number[] }>();
  for (const m of mentions) {
    const date = m.detectedAt.slice(0, 10);
    const bucket = byDay.get(date) ?? { pos: 0, neu: 0, neg: 0, scores: [] };
    if (m.sentiment === "positive") bucket.pos++;
    else if (m.sentiment === "negative") bucket.neg++;
    else bucket.neu++;
    bucket.scores.push(m.sentimentScore);
    byDay.set(date, bucket);
  }
  const sentimentByDay: SentimentDay[] = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, b]) => ({
      date,
      positive: b.pos,
      neutral: b.neu,
      negative: b.neg,
      netScore: Number((b.scores.reduce((x, y) => x + y, 0) / b.scores.length).toFixed(3)),
    }));

  return {
    mentions,
    sentimentByDay,
    live,
    log: [`Collected ${mentions.length} mention(s)${live ? " from GDELT" : " (sample fallback)"}.`],
  };
}
