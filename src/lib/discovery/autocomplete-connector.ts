/**
 * Search-autocomplete / defamation connector.
 *
 * Pulls Google Autocomplete suggestions for a subject's name via SerpApi and
 * flags damaging ones ("<name> scam", "<name> lawsuit", …) — the reputation
 * signal a searcher sees *before* clicking any result. Damaging suggestions
 * become `negative_press` threats + name exposures.
 *
 * Key-gated, mirrors the breach / reverse-image connectors:
 *   - No SERPAPI_API_KEY → deterministic offline simulator (demo stays live).
 *   - Key present        → live Google Autocomplete suggestions.
 * Timeout-safe, never throws; mappers are pure + unit-tested; fetch injectable.
 */

import type { Exposure, Subject, Threat } from "@/lib/types";
import { fetchJsonWithTimeout } from "@/lib/net/keyed-fetch";
import { type DiscoveryFinding, type DiscoveryInput, type DiscoverySource } from "./source";

/** Words that turn a neutral name query into a reputation-damaging suggestion. */
const DEFAMATORY = [
  "scam", "fraud", "fraudster", "lawsuit", "sued", "arrest", "arrested",
  "criminal", "crime", "fake", "scandal", "complaint", "racist", "fired",
  "leaked", "exposed", "mugshot", "investigation", "allegations", "controversy",
  "cheat", "cheater", "bankruptcy",
];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Return the damaging keyword a suggestion matches, or null if it's benign. */
export function defamatoryKeyword(suggestion: string): string | null {
  const low = suggestion.toLowerCase();
  for (const kw of DEFAMATORY) {
    if (new RegExp(`\\b${kw}\\b`).test(low)) return kw;
  }
  return null;
}

/** A single SerpApi Google Autocomplete `suggestions[]` entry (field we use). */
export interface AutocompleteSuggestion {
  value?: string;
}

/** Map autocomplete suggestions into exposures + negative-press threats for the
 *  damaging ones (deduped by suggestion text). */
export function classifyAutocomplete(
  suggestions: string[],
  subject: Subject,
  now = new Date().toISOString(),
): DiscoveryFinding {
  const exposures: Exposure[] = [];
  const threats: Threat[] = [];
  const seen = new Set<string>();

  for (const raw of suggestions) {
    const value = (raw ?? "").trim();
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);

    const kw = defamatoryKeyword(value);
    if (!kw) continue;

    const id = hash(subject.id + key);
    exposures.push({
      id: `acx-${id}`,
      subjectId: subject.id,
      category: "name",
      source: "search_engine",
      sourceName: "Google Autocomplete",
      snippet: `Search autocomplete suggests "${value}" for ${subject.displayName}.`,
      riskLevel: "high",
      riskScore: 38,
      status: "discovered",
      discoveredAt: now,
      lastSeenAt: now,
    });
    threats.push({
      id: `act-${id}`,
      subjectId: subject.id,
      kind: "negative_press",
      title: `Damaging search suggestion: "${value}"`,
      detail: `Google Autocomplete surfaces "${value}" when people search ${subject.displayName} (matched "${kw}") — a reputation signal seen before any result is clicked.`,
      riskLevel: "high",
      source: "search_engine",
      detectedAt: now,
      acknowledged: false,
    });
  }

  return { exposures, threats, log: [`${suggestions.length} suggestion(s) → ${threats.length} damaging.`] };
}

/** Deterministic offline simulation (no SerpApi key) so the demo shows the
 *  capability. Biased to include a damaging suggestion. */
export function simulateAutocomplete(subject: Subject, now = new Date().toISOString()): DiscoveryFinding {
  const terms = ["scam", "lawsuit", "net worth", "fraud", "wikipedia"];
  const h = hash(subject.displayName + "autocomplete");
  const picks = [
    `${subject.displayName} ${terms[h % terms.length]}`,
    `${subject.displayName} ${terms[(h + 2) % terms.length]}`,
  ];
  return classifyAutocomplete(picks, subject, now);
}

export class AutocompleteConnector implements DiscoverySource {
  readonly id = "autocomplete";
  readonly name = "Search Autocomplete Connector";

  constructor(
    private apiKey = process.env.SERPAPI_API_KEY,
    private fetchImpl: typeof fetch = fetch,
  ) {}

  async scan({ subject, meter }: DiscoveryInput): Promise<DiscoveryFinding> {
    if (!this.apiKey) return simulateAutocomplete(subject);
    // Internal budget backstop — skip the paid call (serve cache/keyless) if the
    // account's ceiling is hit. Never surfaced to the user.
    if (meter && !(await meter.consume(1))) {
      return { exposures: [], threats: [], log: ["budget ceiling reached; autocomplete skipped."] };
    }

    try {
      const data = await fetchJsonWithTimeout<{ suggestions?: AutocompleteSuggestion[] }>(
        `https://serpapi.com/search.json?engine=google_autocomplete&q=${encodeURIComponent(subject.displayName)}&api_key=${this.apiKey}`,
        { timeoutMs: 8000, fetchImpl: this.fetchImpl, label: "SerpApi" },
      );
      const values = (data.suggestions ?? []).map((s) => s.value ?? "").filter(Boolean);
      return classifyAutocomplete(values, subject);
    } catch (err) {
      return { exposures: [], threats: [], log: [`autocomplete lookup failed: ${(err as Error).message}`] };
    }
  }
}
