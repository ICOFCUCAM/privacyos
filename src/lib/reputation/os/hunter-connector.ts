/**
 * Hunter.io contact connector (Phase 2 — keyed, optional).
 *
 * Resolves real newsroom/editorial contacts for an outlet domain via Hunter.io's
 * domain-search, so journalists discovered from coverage become contactable.
 * Key-gated and best-effort: no HUNTER_API_KEY, an error, or empty all degrade
 * to `live: false` (a no-op enrichment). Fetch is injectable for tests. See
 * docs/reputation-journalist-integration.md.
 */

import { fetchJsonWithTimeout } from "@/lib/net/keyed-fetch";

export interface HunterContact {
  email: string;
  firstName?: string;
  lastName?: string;
  position?: string;
  /** Hunter's deliverability confidence, 0–100. */
  confidence: number;
}

export interface HunterSource {
  findContacts(domain: string, limit?: number): Promise<{ contacts: HunterContact[]; live: boolean }>;
}

interface HunterEmail {
  value?: string;
  confidence?: number;
  first_name?: string | null;
  last_name?: string | null;
  position?: string | null;
}

/** Map Hunter domain-search `data.emails` into HunterContacts. */
export function mapHunterDomainSearch(data: { data?: { emails?: HunterEmail[] } }, limit = 5): HunterContact[] {
  return (data.data?.emails ?? [])
    .filter((e) => e.value)
    .slice(0, limit)
    .map((e) => ({
      email: e.value!,
      firstName: e.first_name ?? undefined,
      lastName: e.last_name ?? undefined,
      position: e.position ?? undefined,
      confidence: e.confidence ?? 0,
    }));
}

export class HunterApiSource implements HunterSource {
  constructor(
    private apiKey: string | undefined,
    private fetchImpl: typeof fetch = fetch,
  ) {}

  async findContacts(domain: string, limit = 5): Promise<{ contacts: HunterContact[]; live: boolean }> {
    if (!this.apiKey || !domain) return { contacts: [], live: false };
    try {
      const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&limit=${limit}&api_key=${encodeURIComponent(this.apiKey)}`;
      const data = await fetchJsonWithTimeout<{ data?: { emails?: HunterEmail[] } }>(url, { fetchImpl: this.fetchImpl, label: "Hunter" });
      return { contacts: mapHunterDomainSearch(data, limit), live: true };
    } catch {
      return { contacts: [], live: false };
    }
  }
}

/** A no-op source used when no Hunter key is configured. */
export class NoHunterSource implements HunterSource {
  async findContacts(): Promise<{ contacts: HunterContact[]; live: boolean }> {
    return { contacts: [], live: false };
  }
}

export function resolveHunterSource(
  env: Record<string, string | undefined> = process.env,
  fetchImpl: typeof fetch = fetch,
): HunterSource {
  if (env.HUNTER_API_KEY) return new HunterApiSource(env.HUNTER_API_KEY, fetchImpl);
  return new NoHunterSource();
}

const EDITORIAL = /editor|press|news|media|communications|reporter|journalist|writer/i;

/** Pick the best media contact: editorial role first, then highest confidence. */
export function bestContact(contacts: HunterContact[]): HunterContact | null {
  if (contacts.length === 0) return null;
  const editorial = contacts.filter((c) => c.position && EDITORIAL.test(c.position));
  const pool = editorial.length > 0 ? editorial : contacts;
  return [...pool].sort((a, b) => b.confidence - a.confidence)[0];
}
