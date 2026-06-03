/**
 * Live exposure scan — the real-data path for the public free scan.
 *
 * Runs the genuinely-live connectors from {name, email} for an unauthenticated
 * visitor, with graceful fallback handled by the caller:
 *   - Breaches / credential leaks → HaveIBeenPwned (by email, needs HIBP_API_KEY)
 *   - Search results               → Google SERP via Olostep/Serper (by name, key)
 *   - News mentions                → GDELT (by name, keyless, live)
 *
 * There is no free "search every data broker" API, so brokers/dark-web are NOT
 * fabricated as live — HIBP supplies the real breach/dark-web signal, and the
 * caller falls back to the deterministic preview only when no live check was
 * possible. The connectors are timeout-safe and never throw. Mappers are pure +
 * unit-tested; the orchestrator is thin and dependency-injectable.
 */

import type { Exposure, Threat, Subject, RiskLevel } from "@/lib/types";
import type { MirrorCategory } from "@/lib/home/scary-mirror";
import type { DiscoverySource } from "@/lib/discovery/source";
import { BreachConnector } from "@/lib/discovery/breach-connector";
import { resolveSerpSource, type SerpResult, type SerpSource } from "@/lib/reputation/os/serp-connector";
import { NewsMentionSource, type RawMention } from "@/lib/reputation/news-connector";
import { brokerForDomain } from "@/lib/home/data-brokers";

const RISK_SCORE: Record<RiskLevel, number> = { low: 8, medium: 20, high: 38, critical: 60 };
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function isValidEmail(email: string | undefined | null): email is string {
  return !!email && EMAIL_RE.test(email.trim());
}

function adhocSubject(name: string, email: string | undefined, id: string): Subject {
  return {
    id,
    type: "individual",
    displayName: name,
    emails: isValidEmail(email) ? [email.trim()] : [],
    phones: [],
    usernames: [],
    createdAt: new Date().toISOString(),
  };
}

export interface SplitSerp {
  /** Results on known data-broker / people-search domains → broker exposures. */
  brokers: Exposure[];
  /** Everything else on page one → general search-engine exposures. */
  search: Exposure[];
}

/**
 * Classify live Google results: a hit on a known broker domain is a real
 * people-search listing (high-value, the brokers layer); the rest are general
 * page-one search exposure. This is how broker detection stays live without
 * scraping the brokers themselves.
 */
export function splitSerpResults(results: SerpResult[], subjectId: string, now = new Date().toISOString()): SplitSerp {
  const brokers: Exposure[] = [];
  const search: Exposure[] = [];
  for (const r of results) {
    const broker = brokerForDomain(r.domain || r.url);
    if (broker) {
      brokers.push({
        id: `broker-${subjectId}-${r.position}`,
        subjectId,
        category: "name",
        source: "data_broker",
        sourceName: broker,
        url: r.url,
        snippet: r.title,
        riskLevel: "high", // people-search listings sell address/phone/relatives
        riskScore: RISK_SCORE.high,
        status: "discovered",
        discoveredAt: now,
        lastSeenAt: now,
      });
    } else {
      const level: RiskLevel = r.position <= 3 ? "medium" : "low";
      search.push({
        id: `serp-${subjectId}-${r.position}`,
        subjectId,
        category: "name",
        source: "search_engine",
        sourceName: r.domain || r.url,
        url: r.url,
        snippet: r.title,
        riskLevel: level,
        riskScore: RISK_SCORE[level],
        status: "discovered",
        discoveredAt: now,
        lastSeenAt: now,
      });
    }
  }
  return { brokers, search };
}

/** Real news mentions → news exposures. */
export function mentionsToExposures(
  mentions: Pick<RawMention, "sourceName" | "url" | "title">[],
  subjectId: string,
  now = new Date().toISOString(),
): Exposure[] {
  return mentions.map((m, i) => ({
    id: `news-${subjectId}-${i}`,
    subjectId,
    category: "name",
    source: "news",
    sourceName: m.sourceName,
    url: m.url,
    snippet: m.title,
    riskLevel: "low",
    riskScore: RISK_SCORE.low,
    status: "discovered",
    discoveredAt: now,
    lastSeenAt: now,
  }));
}

export interface LiveScanResult {
  exposures: Exposure[];
  threats: Threat[];
  /** Mirror categories that returned genuinely-live external data. */
  liveLayers: MirrorCategory[];
  /** True when a real, paid external check was possible (keys present). */
  keysConfigured: boolean;
}

export interface LiveScanDeps {
  breach?: Pick<DiscoverySource, "scan">;
  serp?: SerpSource;
  news?: Pick<NewsMentionSource, "fetch">;
  env?: Record<string, string | undefined>;
}

/**
 * Run the live connectors for a visitor. Returns whatever genuinely-live data
 * was found (never throws); the caller decides live-vs-preview from
 * `keysConfigured` + whether anything was found.
 */
export async function liveExposureScan(
  input: { name: string; email?: string; subjectId: string },
  deps: LiveScanDeps = {},
): Promise<LiveScanResult> {
  const env = deps.env ?? process.env;
  const exposures: Exposure[] = [];
  const threats: Threat[] = [];
  const liveLayers = new Set<MirrorCategory>();

  const hibpReady = isValidEmail(input.email) && !!env.HIBP_API_KEY;
  const serpReady = !!env.OLOSTEP_API_KEY || !!env.SERPER_API_KEY;

  // Breaches / credential leaks — HIBP, by email.
  if (hibpReady || deps.breach) {
    try {
      const breach = deps.breach ?? new BreachConnector(env.HIBP_API_KEY);
      const f = await breach.scan({
        subject: adhocSubject(input.name, input.email, input.subjectId),
        existing: [],
        existingThreats: [],
      });
      if (f.exposures.length || f.threats.length) {
        exposures.push(...f.exposures);
        threats.push(...f.threats);
        liveLayers.add("breaches");
      }
    } catch {
      /* connector degrades silently */
    }
  }

  // Search results — Google SERP (Olostep → Serper), by name. Broker listings in
  // the results become live broker detections; the rest are search exposure.
  if (serpReady || deps.serp) {
    try {
      const serp = deps.serp ?? resolveSerpSource(env);
      const r = await serp.search(input.name, 10);
      if (r.live && r.results.length) {
        const { brokers, search } = splitSerpResults(r.results, input.subjectId);
        if (brokers.length) {
          exposures.push(...brokers);
          liveLayers.add("brokers");
        }
        if (search.length) {
          exposures.push(...search);
          liveLayers.add("reputation");
        }
      }
    } catch {
      /* ignore */
    }
  }

  // News mentions — GDELT (keyless, live).
  try {
    const news = deps.news ?? new NewsMentionSource();
    const n = await news.fetch(input.name, 8);
    if (n.live && n.mentions.length) {
      exposures.push(...mentionsToExposures(n.mentions, input.subjectId));
      liveLayers.add("reputation");
    }
  } catch {
    /* ignore */
  }

  return { exposures, threats, liveLayers: [...liveLayers], keysConfigured: hibpReady || serpReady };
}
