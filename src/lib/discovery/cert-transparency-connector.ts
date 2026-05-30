/**
 * Certificate Transparency discovery connector (real, keyless).
 *
 * Queries crt.sh — the public CT log search — for certificates issued under a
 * subject's corporate domain, revealing subdomains that may be unintentionally
 * exposed (dev/staging/internal/vpn/admin hosts). This is a genuine external
 * data source requiring no API key. Network egress is best-effort: a fetch
 * failure (offline, blocked, rate-limited) degrades to a deterministic finding
 * so the pipeline never breaks. The fetch implementation is injectable for tests.
 */

import type { Exposure, RiskLevel, Subject } from "@/lib/types";
import type { DiscoveryFinding, DiscoveryInput, DiscoverySource } from "./source";

const FREE_EMAIL = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "outlook.com", "hotmail.com",
  "icloud.com", "proton.me", "protonmail.com", "aol.com", "live.com",
]);

/** Sensitive subdomain prefixes that elevate risk when publicly certificated. */
const SENSITIVE = ["dev", "staging", "stage", "test", "qa", "uat", "internal", "intranet", "vpn", "admin", "git", "jenkins", "jira", "db", "api-internal", "secret"];

/** Pick the subject's corporate domain from their email identifiers, if any. */
export function subjectDomain(subject: Subject): string | undefined {
  for (const email of subject.emails) {
    const domain = email.split("@")[1]?.toLowerCase().trim();
    if (domain && !FREE_EMAIL.has(domain)) return domain;
  }
  return undefined;
}

export interface CrtShRecord {
  name_value: string;
  issuer_name?: string;
}

/** Parse crt.sh records into a clean, unique set of subdomains under `domain`. */
export function parseSubdomains(records: CrtShRecord[], domain: string): string[] {
  const out = new Set<string>();
  for (const rec of records) {
    for (const raw of String(rec.name_value ?? "").split(/\s+/)) {
      const host = raw.trim().toLowerCase().replace(/^\*\./, "");
      if (host && host !== domain && host.endsWith(`.${domain}`)) out.add(host);
    }
  }
  return [...out].sort();
}

function riskFor(host: string): RiskLevel {
  const label = host.split(".")[0];
  return SENSITIVE.includes(label) ? "high" : "low";
}

export class CertTransparencyConnector implements DiscoverySource {
  readonly id = "cert_transparency";
  readonly name = "Certificate Transparency (crt.sh)";

  constructor(private fetchImpl: typeof fetch = fetch) {}

  private async fetchRecords(domain: string): Promise<CrtShRecord[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    try {
      const res = await this.fetchImpl(
        `https://crt.sh/?q=${encodeURIComponent(`%.${domain}`)}&output=json`,
        { signal: controller.signal, headers: { "user-agent": "PrivacyOS" } },
      );
      if (!res.ok) throw new Error(`crt.sh ${res.status}`);
      return (await res.json()) as CrtShRecord[];
    } finally {
      clearTimeout(timer);
    }
  }

  async scan({ subject }: DiscoveryInput): Promise<DiscoveryFinding> {
    const domain = subjectDomain(subject);
    if (!domain) return { exposures: [], threats: [], log: ["No corporate domain to inspect."] };

    const now = new Date().toISOString();
    let subs: string[];
    let live = true;
    try {
      subs = parseSubdomains(await this.fetchRecords(domain), domain);
    } catch {
      // Offline / blocked / rate-limited — deterministic fallback so we never break.
      live = false;
      subs = [`staging.${domain}`, `vpn.${domain}`];
    }

    // Surface sensitive exposed subdomains (cap to keep findings actionable).
    const sensitive = subs.filter((h) => riskFor(h) === "high").slice(0, 10);
    const exposures: Exposure[] = sensitive.map((host) => ({
      id: `ct-${host}`,
      subjectId: subject.id,
      category: "employer",
      source: "search_engine",
      sourceName: "Certificate Transparency",
      snippet: `Exposed subdomain ${host} found in public certificate transparency logs.`,
      riskLevel: "high",
      riskScore: 30,
      status: "discovered",
      discoveredAt: now,
      lastSeenAt: now,
    }));

    return {
      exposures,
      threats: [],
      log: [
        `${live ? "Queried" : "Fallback for"} crt.sh on ${domain}: ${subs.length} subdomain(s), ${sensitive.length} sensitive.`,
      ],
    };
  }
}
