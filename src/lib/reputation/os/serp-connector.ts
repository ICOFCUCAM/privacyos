/**
 * SERP connector for live search rankings.
 *
 * Fetches real Google organic results for a query via Serper.dev when a
 * SERPER_API_KEY is configured. Network egress is best-effort and key-gated: no
 * key, a fetch failure, or an error all degrade to `live: false` so the SEO page
 * falls back to its deterministic model. The fetch implementation is injectable
 * for tests. Mirrors the news-connector / LLM-provider seams.
 */

import { fetchJsonWithTimeout } from "@/lib/net/keyed-fetch";

export interface SerpResult {
  position: number;
  title: string;
  url: string;
  domain: string;
}

export type SerpProvider = "olostep" | "serper" | "google_cse" | "none";

export interface SerpResponse {
  results: SerpResult[];
  live: boolean;
  provider: SerpProvider;
}

export interface SerpSource {
  search(query: string, limit?: number): Promise<SerpResponse>;
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

interface SerperOrganic {
  title?: string;
  link?: string;
  position?: number;
}

/** Map Serper.dev `organic` results into ranked SerpResults (positions 1..N). */
export function mapSerperOrganic(organic: SerperOrganic[], limit = 10): SerpResult[] {
  return organic
    .filter((o) => o.title && o.link)
    .slice(0, limit)
    .map((o, i) => ({
      position: o.position ?? i + 1,
      title: o.title!.trim(),
      url: o.link!,
      domain: domainOf(o.link!),
    }));
}

export class SerperSource implements SerpSource {
  constructor(
    private apiKey: string | undefined,
    private fetchImpl: typeof fetch = fetch,
  ) {}

  async search(query: string, limit = 10): Promise<SerpResponse> {
    if (!this.apiKey) return { results: [], live: false, provider: "serper" };
    try {
      const data = await fetchJsonWithTimeout<{ organic?: SerperOrganic[] }>("https://google.serper.dev/search", {
        timeoutMs: 5000,
        fetchImpl: this.fetchImpl,
        label: "Serper",
        init: {
          method: "POST",
          headers: { "X-API-KEY": this.apiKey, "Content-Type": "application/json" },
          body: JSON.stringify({ q: query, num: limit }),
        },
      });
      return { results: mapSerperOrganic(data.organic ?? [], limit), live: true, provider: "serper" };
    } catch {
      return { results: [], live: false, provider: "serper" };
    }
  }
}

interface OlostepOrganic {
  title?: string;
  link?: string;
  position?: number;
}

/** Parse Olostep's `json_content` (a stringified JSON) into its organic array. */
export function parseOlostepOrganic(jsonContent: unknown): OlostepOrganic[] {
  let obj: unknown = jsonContent;
  if (typeof jsonContent === "string") {
    try { obj = JSON.parse(jsonContent); } catch { return []; }
  }
  const organic = (obj as { organic?: unknown })?.organic;
  return Array.isArray(organic) ? (organic as OlostepOrganic[]) : [];
}

/** Map Olostep google-search organic results into ranked SerpResults. */
export function mapOlostepOrganic(organic: OlostepOrganic[], limit = 10): SerpResult[] {
  return organic
    .filter((o) => o.title && o.link)
    .slice(0, limit)
    .map((o, i) => ({
      position: o.position ?? i + 1,
      title: o.title!.trim(),
      url: o.link!,
      domain: domainOf(o.link!),
    }));
}

/**
 * Olostep web-data API — real Google SERP via the `@olostep/google-search`
 * parser on the /v1/scrapes endpoint. Scraping a live page can take several
 * seconds, so the timeout is longer than the other providers'.
 */
export class OlostepSerpSource implements SerpSource {
  constructor(
    private apiKey: string | undefined,
    private fetchImpl: typeof fetch = fetch,
  ) {}

  async search(query: string, limit = 10): Promise<SerpResponse> {
    if (!this.apiKey) return { results: [], live: false, provider: "olostep" };
    try {
      const data = await fetchJsonWithTimeout<{ result?: { json_content?: unknown }; json_content?: unknown }>("https://api.olostep.com/v1/scrapes", {
        timeoutMs: 15000,
        fetchImpl: this.fetchImpl,
        label: "Olostep",
        init: {
          method: "POST",
          headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            url_to_scrape: `https://www.google.com/search?q=${encodeURIComponent(query)}&gl=us&hl=en`,
            formats: ["json"],
            parser: { id: "@olostep/google-search" },
          }),
        },
      });
      const content = data.result?.json_content ?? data.json_content;
      const results = mapOlostepOrganic(parseOlostepOrganic(content), limit);
      return { results, live: results.length > 0, provider: "olostep" };
    } catch {
      return { results: [], live: false, provider: "olostep" };
    }
  }
}

interface CseItem {
  title?: string;
  link?: string;
}

/** Map Google Custom Search `items` into ranked SerpResults (positions 1..N). */
export function mapCseItems(items: CseItem[], limit = 10): SerpResult[] {
  return items
    .filter((i) => i.title && i.link)
    .slice(0, limit)
    .map((i, idx) => ({
      position: idx + 1, // CSE returns items in rank order; no explicit position.
      title: i.title!.trim(),
      url: i.link!,
      domain: domainOf(i.link!),
    }));
}

/**
 * Google Programmable Search (Custom Search JSON API) — a cheap/free organic
 * Google source that doesn't depend on SerpApi or the scraping providers (100
 * queries/day free, then ~$5/1k). Needs both a key and a Search Engine ID (cx).
 * Used as the fallback after Olostep/Serper so the platform isn't locked to one
 * vendor for organic Google results.
 */
export class GoogleCseSource implements SerpSource {
  constructor(
    private apiKey: string | undefined,
    private cx: string | undefined,
    private fetchImpl: typeof fetch = fetch,
  ) {}

  async search(query: string, limit = 10): Promise<SerpResponse> {
    if (!this.apiKey || !this.cx) return { results: [], live: false, provider: "google_cse" };
    try {
      const data = await fetchJsonWithTimeout<{ items?: CseItem[] }>(
        `https://www.googleapis.com/customsearch/v1?key=${this.apiKey}&cx=${this.cx}&q=${encodeURIComponent(query)}&num=${Math.min(limit, 10)}`,
        { timeoutMs: 6000, fetchImpl: this.fetchImpl, label: "Google CSE" },
      );
      return { results: mapCseItems(data.items ?? [], limit), live: true, provider: "google_cse" };
    } catch {
      return { results: [], live: false, provider: "google_cse" };
    }
  }
}

/** A no-op source used when no SERP provider is configured. */
export class NoSerpSource implements SerpSource {
  async search(): Promise<SerpResponse> {
    return { results: [], live: false, provider: "none" };
  }
}

/**
 * Resolve the SERP source from the environment. Precedence: Olostep (real
 * Google SERP) → Serper.dev → Google Programmable Search (cheap/free fallback)
 * → the deterministic model. Multiple providers keep the platform from being
 * locked to one vendor. (Azure Bing Search was retired by Microsoft on
 * 2025-08-11 and is intentionally not supported.)
 */
export function resolveSerpSource(
  env: Record<string, string | undefined> = process.env,
  fetchImpl: typeof fetch = fetch,
): SerpSource {
  if (env.OLOSTEP_API_KEY) return new OlostepSerpSource(env.OLOSTEP_API_KEY, fetchImpl);
  if (env.SERPER_API_KEY) return new SerperSource(env.SERPER_API_KEY, fetchImpl);
  if (env.GOOGLE_CSE_API_KEY && env.GOOGLE_CSE_CX) {
    return new GoogleCseSource(env.GOOGLE_CSE_API_KEY, env.GOOGLE_CSE_CX, fetchImpl);
  }
  return new NoSerpSource();
}
