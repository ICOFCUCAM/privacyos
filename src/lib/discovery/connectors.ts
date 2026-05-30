/**
 * Additional discovery layers.
 *
 * Each implements the same `DiscoverySource` interface as the breach connector,
 * so the pipeline treats them uniformly. They are deterministic mock providers
 * today (no external keys required) and are designed to be swapped for real
 * providers — Google/SerpAPI, news APIs, social platform APIs, passive-DNS /
 * certificate-transparency feeds, dark-web crawlers — behind the same contract.
 */

import type { Exposure, Threat } from "@/lib/types";
import type { DiscoveryFinding, DiscoveryInput, DiscoverySource } from "./source";

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const now = () => new Date().toISOString();

/** Google / search-engine discovery layer. */
export class SearchConnector implements DiscoverySource {
  readonly id = "search_engine";
  readonly name = "Search Engine Discovery Layer";
  async scan({ subject }: DiscoveryInput): Promise<DiscoveryFinding> {
    const h = hash(subject.displayName + "search");
    const exposures: Exposure[] = [
      {
        id: `srch-${h}`,
        subjectId: subject.id,
        category: "name",
        source: "search_engine",
        sourceName: "Google Search",
        url: `https://www.google.com/search?q=${encodeURIComponent(subject.displayName)}`,
        snippet: `${subject.displayName} appears in ${3 + (h % 5)} page-one results across people-search and profile sites.`,
        riskLevel: "medium",
        riskScore: 20,
        status: "discovered",
        discoveredAt: now(),
        lastSeenAt: now(),
      },
    ];
    return { exposures, threats: [], log: [`Indexed page-one results for ${subject.displayName}.`] };
  }
}

/** News discovery layer. */
export class NewsConnector implements DiscoverySource {
  readonly id = "news";
  readonly name = "News Discovery Layer";
  async scan({ subject }: DiscoveryInput): Promise<DiscoveryFinding> {
    const h = hash(subject.displayName + "news");
    if (h % 3 === 0) return { exposures: [], threats: [], log: ["No new news mentions."] };
    const exposures: Exposure[] = [
      {
        id: `news-${h}`,
        subjectId: subject.id,
        category: "employer",
        source: "news",
        sourceName: "Industry Wire",
        snippet: `Article references ${subject.organization ?? subject.displayName} in a developing story.`,
        riskLevel: "high",
        riskScore: 34,
        status: "monitoring",
        discoveredAt: now(),
        lastSeenAt: now(),
      },
    ];
    return { exposures, threats: [], log: ["1 news mention captured."] };
  }
}

/** Social-media discovery layer (handles + impersonation signals). */
export class SocialConnector implements DiscoverySource {
  readonly id = "social";
  readonly name = "Social Discovery Layer";
  async scan({ subject }: DiscoveryInput): Promise<DiscoveryFinding> {
    const exposures: Exposure[] = [];
    const threats: Threat[] = [];
    for (const handle of subject.usernames) {
      const h = hash(handle + "social");
      exposures.push({
        id: `soc-${h}`,
        subjectId: subject.id,
        category: "username",
        source: "social_media",
        sourceName: "Social platform",
        snippet: `Handle @${handle} resolves to a public profile with linkable personal details.`,
        riskLevel: "medium",
        riskScore: 20,
        status: "discovered",
        discoveredAt: now(),
        lastSeenAt: now(),
      });
      if (h % 4 === 0) {
        threats.push({
          id: `soct-${h}`,
          subjectId: subject.id,
          kind: "impersonation",
          title: `Possible impersonation of @${handle}`,
          detail: `A lookalike account mimicking @${handle} was detected.`,
          riskLevel: "high",
          source: "social_media",
          detectedAt: now(),
          acknowledged: false,
        });
      }
    }
    return { exposures, threats, log: [`Scanned ${subject.usernames.length} handle(s).`] };
  }
}

/** Domain discovery layer (typosquats, exposed assets). */
export class DomainConnector implements DiscoverySource {
  readonly id = "domain";
  readonly name = "Domain Discovery Layer";
  async scan({ subject }: DiscoveryInput): Promise<DiscoveryFinding> {
    if (!subject.organization) return { exposures: [], threats: [], log: ["No org domain to scan."] };
    const h = hash(subject.organization + "domain");
    const threats: Threat[] = [
      {
        id: `dom-${h}`,
        subjectId: subject.id,
        kind: "impersonation",
        title: "Typosquat domain detected",
        detail: `A lookalike domain targeting ${subject.organization} was registered.`,
        riskLevel: "high",
        source: "forum",
        detectedAt: now(),
        acknowledged: false,
      },
    ];
    return { exposures: [], threats, log: ["1 domain risk detected."] };
  }
}

/** Dark-web discovery layer (paste sites, marketplaces, leak channels). */
export class DarkWebConnector implements DiscoverySource {
  readonly id = "dark_web";
  readonly name = "Dark Web Discovery Layer";
  async scan({ subject }: DiscoveryInput): Promise<DiscoveryFinding> {
    const exposures: Exposure[] = [];
    for (const email of subject.emails) {
      const h = hash(email + "darkweb");
      if (h % 2 !== 0) continue;
      exposures.push({
        id: `dw-${h}`,
        subjectId: subject.id,
        category: "credential",
        source: "dark_web",
        sourceName: "Paste site",
        snippet: `${email} observed in a paste-site combolist.`,
        riskLevel: "critical",
        riskScore: 55,
        status: "discovered",
        discoveredAt: now(),
        lastSeenAt: now(),
      });
    }
    return { exposures, threats: [], log: [`Swept dark-web sources for ${subject.emails.length} email(s).`] };
  }
}
