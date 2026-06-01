/**
 * Podcast connector for live opportunity discovery.
 *
 * Queries the public iTunes Search API (keyless, real) for podcasts in the
 * subject's space — genuine shows the principal could appear on. Network egress
 * is best-effort: any failure degrades to `live: false` so the Intelligence page
 * falls back to its deterministic list. Fetch is injectable for tests.
 */

import { fetchJsonWithTimeout } from "@/lib/net/keyed-fetch";

export interface PodcastResult {
  name: string;
  publisher: string;
  genre: string;
  episodes: number;
}

export interface PodcastSource {
  search(term: string, limit?: number): Promise<{ podcasts: PodcastResult[]; live: boolean }>;
}

interface ItunesPodcast {
  collectionName?: string;
  artistName?: string;
  primaryGenreName?: string;
  trackCount?: number;
}

/** Map iTunes Search API podcast results into PodcastResults. */
export function mapItunesPodcasts(results: ItunesPodcast[], limit = 6): PodcastResult[] {
  return results
    .filter((r) => r.collectionName)
    .slice(0, limit)
    .map((r) => ({
      name: r.collectionName!.trim(),
      publisher: (r.artistName ?? "Independent").trim(),
      genre: r.primaryGenreName ?? "Podcast",
      episodes: r.trackCount ?? 0,
    }));
}

export class ItunesPodcastSource implements PodcastSource {
  constructor(private fetchImpl: typeof fetch = fetch) {}

  async search(term: string, limit = 6): Promise<{ podcasts: PodcastResult[]; live: boolean }> {
    const url =
      `https://itunes.apple.com/search?media=podcast&limit=${limit}` +
      `&term=${encodeURIComponent(term)}`;
    try {
      const data = await fetchJsonWithTimeout<{ results?: ItunesPodcast[] }>(url, { timeoutMs: 5000, fetchImpl: this.fetchImpl, label: "iTunes" });
      const podcasts = mapItunesPodcasts(data.results ?? [], limit);
      return { podcasts, live: podcasts.length > 0 };
    } catch {
      return { podcasts: [], live: false };
    }
  }
}

/** Resolve the podcast source — keyless, always available (best-effort). */
export function resolvePodcastSource(fetchImpl: typeof fetch = fetch): PodcastSource {
  return new ItunesPodcastSource(fetchImpl);
}
