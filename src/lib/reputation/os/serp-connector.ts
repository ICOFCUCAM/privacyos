/**
 * SERP connector for live search rankings.
 *
 * Fetches real Google organic results for a query via Serper.dev when a
 * SERPER_API_KEY is configured. Network egress is best-effort and key-gated: no
 * key, a fetch failure, or an error all degrade to `live: false` so the SEO page
 * falls back to its deterministic model. The fetch implementation is injectable
 * for tests. Mirrors the news-connector / LLM-provider seams.
 */

export interface SerpResult {
  position: number;
  title: string;
  url: string;
  domain: string;
}

export interface SerpSource {
  search(query: string, limit?: number): Promise<{ results: SerpResult[]; live: boolean }>;
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

  async search(query: string, limit = 10): Promise<{ results: SerpResult[]; live: boolean }> {
    if (!this.apiKey) return { results: [], live: false };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await this.fetchImpl("https://google.serper.dev/search", {
        method: "POST",
        signal: controller.signal,
        headers: { "X-API-KEY": this.apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ q: query, num: limit }),
      });
      if (!res.ok) throw new Error(`Serper ${res.status}`);
      const data = (await res.json()) as { organic?: SerperOrganic[] };
      return { results: mapSerperOrganic(data.organic ?? [], limit), live: true };
    } catch {
      return { results: [], live: false };
    } finally {
      clearTimeout(timer);
    }
  }
}

/** A no-op source used when no SERP provider is configured. */
export class NoSerpSource implements SerpSource {
  async search(): Promise<{ results: SerpResult[]; live: boolean }> {
    return { results: [], live: false };
  }
}

/** Resolve the SERP source from the environment (Serper.dev when keyed). */
export function resolveSerpSource(
  env: Record<string, string | undefined> = process.env,
  fetchImpl: typeof fetch = fetch,
): SerpSource {
  if (env.SERPER_API_KEY) return new SerperSource(env.SERPER_API_KEY, fetchImpl);
  return new NoSerpSource();
}
