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

export type SerpProvider = "olostep" | "serper" | "none";

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

/** A no-op source used when no SERP provider is configured. */
export class NoSerpSource implements SerpSource {
  async search(): Promise<SerpResponse> {
    return { results: [], live: false, provider: "none" };
  }
}

/**
 * Resolve the SERP source from the environment. Precedence: Olostep (real
 * Google SERP) → Serper.dev → the deterministic model. (Azure Bing Search was
 * retired by Microsoft on 2025-08-11 and is intentionally not supported.)
 */
export function resolveSerpSource(
  env: Record<string, string | undefined> = process.env,
  fetchImpl: typeof fetch = fetch,
): SerpSource {
  if (env.OLOSTEP_API_KEY) return new OlostepSerpSource(env.OLOSTEP_API_KEY, fetchImpl);
  if (env.SERPER_API_KEY) return new SerperSource(env.SERPER_API_KEY, fetchImpl);
  return new NoSerpSource();
}
