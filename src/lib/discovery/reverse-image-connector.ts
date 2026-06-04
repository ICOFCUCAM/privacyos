/**
 * Reverse-image / impersonation connector.
 *
 * Reverse-image-searches a subject's photo(s) via SerpApi's Google Lens engine
 * to find where their face/photos appear online — the real signal behind
 * "Impersonation Detection" and unauthorized-photo use. A visual match on a
 * social/profile domain becomes an impersonation threat; every match is a photo
 * exposure.
 *
 * Like the breach connector, it is key-gated and degrades gracefully:
 *   - No SERPAPI_API_KEY            → deterministic offline simulator (demo data),
 *                                      so the pipeline + dashboard stay exercisable.
 *   - Key present, no subject photo → no-op (never fabricate findings for a real
 *                                      customer; needs a photo to search).
 *   - Key present, photo(s) present → live Google Lens visual matches.
 * Network egress is timeout-safe and never throws. Mappers are pure + unit-tested;
 * fetch is injectable. Mirrors the breach-connector / SERP-connector seams.
 */

import type { Exposure, RiskLevel, Subject, Threat } from "@/lib/types";
import { fetchJsonWithTimeout } from "@/lib/net/keyed-fetch";
import {
  type DiscoveryFinding,
  type DiscoveryInput,
  type DiscoverySource,
} from "./source";

const RISK_SCORE: Record<RiskLevel, number> = { low: 8, medium: 20, high: 38, critical: 60 };

/** Social/profile hosts where a face match most likely means impersonation or
 *  unauthorized use (rather than incidental web presence). */
const SOCIAL_DOMAINS = new Set([
  "facebook.com", "instagram.com", "twitter.com", "x.com", "tiktok.com",
  "linkedin.com", "youtube.com", "threads.net", "snapchat.com", "reddit.com",
  "pinterest.com", "vk.com", "onlyfans.com", "tinder.com", "bumble.com",
]);

/** Stable small hash for deterministic ids + offline simulation. */
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

/** A single SerpApi Google Lens `visual_matches[]` entry (fields we use). */
export interface LensMatch {
  title?: string;
  link?: string;
  source?: string;
  thumbnail?: string;
}

/**
 * Map Google Lens visual matches into photo exposures (+ impersonation threats
 * for social/profile hits). One finding per distinct domain so a single noisy
 * host doesn't flood the footprint.
 */
export function mapLensMatches(
  matches: LensMatch[],
  subject: Subject,
  imageRef: string,
  now = new Date().toISOString(),
): DiscoveryFinding {
  const exposures: Exposure[] = [];
  const threats: Threat[] = [];
  const seen = new Set<string>();

  for (const m of matches) {
    if (!m.link || !m.title) continue;
    const domain = domainOf(m.link);
    if (!domain || seen.has(domain)) continue;
    seen.add(domain);

    const social = SOCIAL_DOMAINS.has(domain);
    const level: RiskLevel = social ? "high" : "medium";
    const title = m.title.trim();

    exposures.push({
      id: `revimg-${hash(subject.id + domain)}`,
      subjectId: subject.id,
      category: "photo",
      source: social ? "social_media" : "search_engine",
      sourceName: m.source || domain,
      url: m.link,
      snippet: `A photo matching ${subject.displayName} appears on ${domain} — "${title}".`,
      riskLevel: level,
      riskScore: RISK_SCORE[level],
      status: "discovered",
      discoveredAt: now,
      lastSeenAt: now,
    });

    if (social) {
      threats.push({
        id: `revimgt-${hash(subject.id + domain)}`,
        subjectId: subject.id,
        kind: "impersonation",
        title: `Possible unauthorized use of your photo on ${domain}`,
        detail: `An image matching ${subject.displayName} was found on ${domain} ("${title}"). If this is not an account you control, it may be impersonation or identity misuse.`,
        riskLevel: "high",
        source: "social_media",
        detectedAt: now,
        acknowledged: false,
      });
    }
  }

  return {
    exposures,
    threats,
    log: [`${matches.length} visual match(es) for ${imageRef} → ${exposures.length} exposure(s), ${threats.length} threat(s).`],
  };
}

/** Deterministic offline simulation (no SerpApi key) so the demo dashboard shows
 *  the capability. Keyed on the subject so results are stable across runs. */
export function simulateReverseImage(subject: Subject, now = new Date().toISOString()): DiscoveryFinding {
  const hosts = ["facebook.com", "instagram.com", "datingsite-example.com", "tiktok.com"];
  const h = hash(subject.displayName + "revimg");
  const count = 1 + (h % 2); // 1–2 matches
  const matches: LensMatch[] = Array.from({ length: count }, (_, i) => {
    const host = hosts[(h + i) % hosts.length];
    return {
      title: `Profile using ${subject.displayName}'s photo`,
      link: `https://${host}/p/${(h + i) % 9973}`,
      source: host,
    };
  });
  return mapLensMatches(matches, subject, "(demo)", now);
}

export class ReverseImageConnector implements DiscoverySource {
  readonly id = "reverse_image";
  readonly name = "Reverse Image / Impersonation Connector";

  constructor(
    private apiKey = process.env.SERPAPI_API_KEY,
    private fetchImpl: typeof fetch = fetch,
  ) {}

  async scan({ subject, meter }: DiscoveryInput): Promise<DiscoveryFinding> {
    // Demo mode: no key → deterministic simulator, so the pipeline stays exercisable.
    if (!this.apiKey) return simulateReverseImage(subject);

    const photos = subject.photos ?? [];
    if (photos.length === 0) {
      // Keyed but nothing to search — never fabricate findings for a real customer.
      return { exposures: [], threats: [], log: ["No subject photo on file; skipping reverse-image scan."] };
    }
    // Internal budget backstop — reserve one search per photo before scanning.
    if (meter && !(await meter.consume(photos.length))) {
      return { exposures: [], threats: [], log: ["budget ceiling reached; reverse-image scan skipped."] };
    }

    const exposures: Exposure[] = [];
    const threats: Threat[] = [];
    const log: string[] = [];

    for (const photo of photos) {
      try {
        const data = await fetchJsonWithTimeout<{ visual_matches?: LensMatch[] }>(
          `https://serpapi.com/search.json?engine=google_lens&url=${encodeURIComponent(photo)}&api_key=${this.apiKey}`,
          { timeoutMs: 10000, fetchImpl: this.fetchImpl, label: "SerpApi" },
        );
        const f = mapLensMatches(data.visual_matches ?? [], subject, photo);
        exposures.push(...f.exposures);
        threats.push(...f.threats);
        log.push(...f.log);
      } catch (err) {
        log.push(`reverse-image lookup failed for ${photo}: ${(err as Error).message}`);
      }
    }

    return { exposures, threats, log };
  }
}
