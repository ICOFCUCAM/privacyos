/**
 * ReputationOS — analysis layer.
 *
 * Scores a subject's reputation across five axes (sentiment, authority, reach,
 * influence, brand perception) and reports monitoring coverage across every
 * channel the platform watches. Pure and unit-tested; derived deterministically
 * from the collected mentions so it holds in live and demo modes.
 */

import type { Mention, MentionChannel, SentimentLabel } from "@/lib/suite-types";

export interface AnalysisScores {
  /** Net sentiment mapped to 0–100 (higher = more positive). */
  sentiment: number;
  /** Credibility of the sources covering the subject. */
  authority: number;
  /** Breadth of footprint across channels + volume. */
  reach: number;
  /** Composite sway = authority × reach × positivity. */
  influence: number;
  /** How the brand is perceived (positive vs negative, defamation-penalized). */
  brandPerception: number;
}

const SENTIMENT_VALUE: Record<SentimentLabel, number> = { positive: 1, neutral: 0, mixed: 0.1, negative: -1 };

// Source credibility weight per channel — news/blogs carry more authority than forums.
const CHANNEL_AUTHORITY: Record<MentionChannel, number> = {
  news: 1, blog: 0.7, review: 0.6, social: 0.5, search: 0.5, forum: 0.4,
};

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function analysisScores(mentions: Mention[]): AnalysisScores {
  if (mentions.length === 0) {
    return { sentiment: 70, authority: 60, reach: 40, influence: 50, brandPerception: 70 };
  }
  const n = mentions.length;
  const net = mentions.reduce((s, m) => s + m.sentimentScore, 0) / n; // -1..1
  const sentiment = clamp((net + 1) * 50);

  const positives = mentions.filter((m) => m.sentiment === "positive").length;
  const negatives = mentions.filter((m) => m.sentiment === "negative").length;
  const defamation = mentions.filter((m) => m.isDefamatory).length;

  const authorityRaw = mentions.reduce((s, m) => s + CHANNEL_AUTHORITY[m.channel] * (m.sentiment === "negative" ? 0.4 : 1), 0);
  const authority = clamp(40 + (authorityRaw / n) * 55);

  const channels = new Set(mentions.map((m) => m.channel)).size;
  const reach = clamp(channels * 12 + Math.min(n, 12) * 4);

  const positivity = (positives - negatives) / n; // -1..1
  const influence = clamp(authority * 0.4 + reach * 0.4 + (positivity + 1) * 10);

  const brandPerception = clamp(60 + positivity * 35 - defamation * 12);

  return { sentiment, authority, reach, influence, brandPerception };
}

/* ── Monitoring coverage ─────────────────────────────────────────────────── */

export type MonitorChannel =
  | "search" | "news" | "blogs" | "forums" | "reddit" | "social" | "video" | "reviews";

export interface ChannelCoverage {
  channel: MonitorChannel;
  label: string;
  mentions: number;
  /** Active monitoring is always on; this flags whether anything was found. */
  active: boolean;
}

const MONITOR_LABEL: Record<MonitorChannel, string> = {
  search: "Search engines", news: "News sites", blogs: "Blogs", forums: "Forums",
  reddit: "Reddit", social: "Social media", video: "Video platforms", reviews: "Review sites",
};

// Which source mentions map onto each monitored surface.
function channelBucket(m: Mention): MonitorChannel {
  if (m.channel === "forum") return /reddit/i.test(m.sourceName) ? "reddit" : "forums";
  if (m.channel === "blog") return "blogs";
  if (m.channel === "review") return "reviews";
  if (m.channel === "news") return "news";
  if (m.channel === "search") return "search";
  if (m.channel === "social") return /youtube|video/i.test(m.sourceName) ? "video" : "social";
  return "search";
}

const ALL_MONITOR: MonitorChannel[] = ["search", "news", "blogs", "forums", "reddit", "social", "video", "reviews"];

export function monitoringCoverage(mentions: Mention[]): ChannelCoverage[] {
  const counts = new Map<MonitorChannel, number>();
  for (const m of mentions) {
    const b = channelBucket(m);
    counts.set(b, (counts.get(b) ?? 0) + 1);
  }
  return ALL_MONITOR.map((channel) => ({
    channel,
    label: MONITOR_LABEL[channel],
    mentions: counts.get(channel) ?? 0,
    active: true,
  }));
}

export interface ReputationOverview {
  scores: AnalysisScores;
  /** Single headline reputation health, 0–100. */
  health: number;
  negatives: number;
  defamation: number;
  channelsMonitored: number;
}

export function reputationOverview(mentions: Mention[]): ReputationOverview {
  const scores = analysisScores(mentions);
  const health = clamp(
    scores.sentiment * 0.3 + scores.brandPerception * 0.3 + scores.authority * 0.2 + scores.influence * 0.2,
  );
  return {
    scores,
    health,
    negatives: mentions.filter((m) => m.sentiment === "negative").length,
    defamation: mentions.filter((m) => m.isDefamatory).length,
    channelsMonitored: ALL_MONITOR.length,
  };
}
