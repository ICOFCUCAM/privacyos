/**
 * GDELT news connector (real, keyless).
 *
 * Queries the public GDELT 2.0 DOC API for recent news articles mentioning a
 * subject. GDELT is free and requires no API key. Network egress is best-effort:
 * a fetch failure (offline, blocked, rate-limited) degrades to a deterministic
 * sample so the pipeline never breaks. The fetch implementation is injectable
 * for tests. Returns raw mentions; sentiment is computed downstream.
 */

import type { MentionChannel } from "@/lib/suite-types";

export interface RawMention {
  channel: MentionChannel;
  sourceName: string;
  url?: string;
  title: string;
  excerpt: string;
  detectedAt: string;
}

interface GdeltArticle {
  url?: string;
  title?: string;
  domain?: string;
  seendate?: string;
  sourcecountry?: string;
}

/** Parse a GDELT seendate like "20260115T120000Z" to ISO; fall back to now. */
function parseSeenDate(s?: string): string {
  if (s && /^\d{8}T\d{6}Z$/.test(s)) {
    const iso = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(9, 11)}:${s.slice(11, 13)}:${s.slice(13, 15)}Z`;
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return new Date().toISOString();
}

export function mapGdeltArticles(articles: GdeltArticle[]): RawMention[] {
  return articles
    .filter((a) => a.title && a.url)
    .map((a) => ({
      channel: "news" as MentionChannel,
      sourceName: a.domain ?? "news",
      url: a.url,
      title: a.title!.trim(),
      excerpt: a.title!.trim(),
      detectedAt: parseSeenDate(a.seendate),
    }));
}

export class NewsMentionSource {
  readonly id = "gdelt_news";
  constructor(private fetchImpl: typeof fetch = fetch) {}

  async fetch(query: string, limit = 25): Promise<{ mentions: RawMention[]; live: boolean }> {
    const url =
      `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(`"${query}"`)}` +
      `&mode=artlist&maxrecords=${limit}&sort=datedesc&format=json`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await this.fetchImpl(url, { signal: controller.signal, headers: { "user-agent": "PrivacyOS" } });
      if (!res.ok) throw new Error(`GDELT ${res.status}`);
      const data = (await res.json()) as { articles?: GdeltArticle[] };
      return { mentions: mapGdeltArticles(data.articles ?? []), live: true };
    } catch {
      return { mentions: sampleMentions(query), live: false };
    } finally {
      clearTimeout(timer);
    }
  }
}

/** Deterministic fallback used when GDELT is unreachable. */
export function sampleMentions(query: string): RawMention[] {
  const now = Date.now();
  const day = 86_400_000;
  return [
    { channel: "news", sourceName: "techcrunch.com", url: "https://techcrunch.com/sample", title: `${query} faces investor lawsuit amid scandal`, excerpt: `${query} faces investor lawsuit amid scandal`, detectedAt: new Date(now - day).toISOString() },
    { channel: "news", sourceName: "bloomberg.com", url: "https://bloomberg.com/sample", title: `${query} closes record fund in strong growth year`, excerpt: `${query} closes record fund in strong growth year`, detectedAt: new Date(now - 3 * day).toISOString() },
    { channel: "news", sourceName: "reuters.com", url: "https://reuters.com/sample", title: `${query} released a routine quarterly filing`, excerpt: `${query} released a routine quarterly filing`, detectedAt: new Date(now - 5 * day).toISOString() },
  ];
}
