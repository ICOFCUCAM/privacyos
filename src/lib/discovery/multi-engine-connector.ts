/**
 * Multi-engine search connector.
 *
 * Broadens exposure discovery beyond Google by querying Bing, DuckDuckGo and
 * Yandex via SerpApi for the subject's name, then reusing the same broker-vs-
 * search classification the live scan uses: a hit on a known data-broker /
 * people-search domain is a `data_broker` exposure, everything else is general
 * `search_engine` exposure. People don't only use Google, so real coverage is
 * multi-engine.
 *
 * Key-gated, mirrors the other SerpApi connectors:
 *   - No SERPAPI_API_KEY → no-op (the deterministic SearchConnector already
 *                          provides the demo search layer; don't double it).
 *   - Key present        → live results across all engines, deduped by domain.
 * Timeout-safe, never throws; the mapper is pure + unit-tested; fetch injectable.
 */

import type { Exposure, RiskLevel, Subject } from "@/lib/types";
import { fetchJsonWithTimeout } from "@/lib/net/keyed-fetch";
import { brokerForDomain } from "@/lib/home/data-brokers";
import { type DiscoveryFinding, type DiscoveryInput, type DiscoverySource } from "./source";

const RISK_SCORE: Record<RiskLevel, number> = { low: 8, medium: 20, high: 38, critical: 60 };

/** SerpApi engines we sweep, with each engine's query-string parameter name. */
export const ENGINES: { engine: string; param: string; label: string }[] = [
  { engine: "bing", param: "q", label: "Bing" },
  { engine: "duckduckgo", param: "q", label: "DuckDuckGo" },
  { engine: "yandex", param: "text", label: "Yandex" },
];

/** A single SerpApi `organic_results[]` entry (fields we use). */
export interface OrganicResult {
  position?: number;
  title?: string;
  link?: string;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * Map one engine's organic results into exposures. Broker-domain hits become
 * `data_broker` listings (high); the rest are `search_engine` exposure (top-3 =
 * medium, else low). Ids are domain-keyed so the connector can dedupe the same
 * site found across multiple engines.
 */
export function mapEngineResults(
  results: OrganicResult[],
  subject: Subject,
  engineLabel: string,
  now = new Date().toISOString(),
): Exposure[] {
  const out: Exposure[] = [];
  for (const r of results) {
    if (!r.link || !r.title) continue;
    const domain = domainOf(r.link);
    if (!domain) continue;

    const broker = brokerForDomain(domain);
    if (broker) {
      out.push({
        id: `me-brk-${hash(subject.id + domain)}`,
        subjectId: subject.id,
        category: "name",
        source: "data_broker",
        sourceName: broker,
        url: r.link,
        snippet: `${subject.displayName} listed on ${broker} (found via ${engineLabel}).`,
        riskLevel: "high",
        riskScore: RISK_SCORE.high,
        status: "discovered",
        discoveredAt: now,
        lastSeenAt: now,
      });
    } else {
      const level: RiskLevel = (r.position ?? 99) <= 3 ? "medium" : "low";
      out.push({
        id: `me-srch-${hash(subject.id + domain)}`,
        subjectId: subject.id,
        category: "name",
        source: "search_engine",
        sourceName: domain,
        url: r.link,
        snippet: `${subject.displayName} appears on ${domain} (via ${engineLabel}).`,
        riskLevel: level,
        riskScore: RISK_SCORE[level],
        status: "discovered",
        discoveredAt: now,
        lastSeenAt: now,
      });
    }
  }
  return out;
}

export class MultiEngineSerpConnector implements DiscoverySource {
  readonly id = "multi_engine_serp";
  readonly name = "Multi-Engine Search Connector";

  constructor(
    private apiKey = process.env.SERPAPI_API_KEY,
    private fetchImpl: typeof fetch = fetch,
  ) {}

  async scan({ subject }: DiscoveryInput): Promise<DiscoveryFinding> {
    // The deterministic SearchConnector already covers the demo search layer, so
    // without a key this connector stays silent rather than duplicating it.
    if (!this.apiKey) return { exposures: [], threats: [], log: ["No SerpApi key; multi-engine sweep skipped (demo search layer covers it)."] };

    const byId = new Map<string, Exposure>(); // dedupe same domain across engines
    const log: string[] = [];

    for (const { engine, param, label } of ENGINES) {
      try {
        const data = await fetchJsonWithTimeout<{ organic_results?: OrganicResult[] }>(
          `https://serpapi.com/search.json?engine=${engine}&${param}=${encodeURIComponent(subject.displayName)}&api_key=${this.apiKey}`,
          { timeoutMs: 10000, fetchImpl: this.fetchImpl, label: "SerpApi" },
        );
        const mapped = mapEngineResults(data.organic_results ?? [], subject, label);
        for (const e of mapped) if (!byId.has(e.id)) byId.set(e.id, e);
        log.push(`${label}: ${mapped.length} result(s).`);
      } catch (err) {
        log.push(`${label} lookup failed: ${(err as Error).message}`);
      }
    }

    return { exposures: [...byId.values()], threats: [], log };
  }
}
