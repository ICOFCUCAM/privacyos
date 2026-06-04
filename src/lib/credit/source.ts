/**
 * Credit-monitoring connector.
 *
 * `CreditSource` is the seam between the engine and a real credit feed. The
 * deterministic demo provider keeps the surface explorable with **no real PII**;
 * the live provider activates when a contracted bureau/aggregator key is present.
 *
 * Wiring a real feed is a deliberate, regulated step — it requires a signed
 * data agreement (Equifax / Experian / TransUnion direct, or an aggregator such
 * as Array, Plaid, MX or Spinwheel), FCRA-compliant handling of the consumer's
 * SSN, and explicit consumer consent. Until `CREDIT_API_KEY` is set, the resolver
 * returns the demo profile and the UI shows a "Demo" badge, so nothing
 * misrepresents the data as live.
 */

import type { CreditAlert, CreditProfile } from "./credit-os";

export interface CreditSource {
  /** Fetch the subject's credit profile. Returns `live: false` to fall back to demo. */
  fetch(subjectKey: string): Promise<{ profile: CreditProfile; live: boolean }>;
}

/** Small deterministic PRNG so the demo profile is stable per subject. */
function seeded(key: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A deterministic, PII-free demo credit profile for the given subject key.
 *  `now` is injectable so the profile is fully reproducible in tests. */
export function demoCreditProfile(subjectKey: string, now: number = Date.now()): CreditProfile {
  const rnd = seeded(subjectKey || "demo");
  const score = 640 + Math.floor(rnd() * 180); // 640–820
  const scoreDelta = Math.floor(rnd() * 60) - 35; // -35..+24
  const ago = (days: number) => new Date(now - days * 86_400_000).toISOString();

  const pool: CreditAlert[] = [
    { id: "ca-1", kind: "hard_inquiry", bureau: "experian", detail: "Auto-loan inquiry from a lender you may not recognize", riskLevel: "medium", detectedAt: ago(2) },
    { id: "ca-2", kind: "new_account", bureau: "transunion", detail: "New revolving credit-card account opened in your name", riskLevel: "high", detectedAt: ago(5) },
    { id: "ca-3", kind: "address_change", bureau: "equifax", detail: "Mailing address on file was updated", riskLevel: "high", detectedAt: ago(9) },
    { id: "ca-4", kind: "score_drop", bureau: "experian", detail: "Score fell after a reported balance increase", riskLevel: "low", detectedAt: ago(11) },
  ];
  // Show a fraud-indicative subset for lower scores; cleaner files show fewer.
  const count = score < 700 ? 4 : score < 760 ? 2 : 1;
  return { score, scoreDelta, alerts: pool.slice(0, count) };
}

/** The demo source (no network, no PII). */
export const demoCreditSource: CreditSource = {
  async fetch(subjectKey: string) {
    return { profile: demoCreditProfile(subjectKey), live: false };
  },
};

/**
 * Resolve the active source. When a partner key is configured this is where the
 * live aggregator/bureau client is constructed; for now it degrades to demo so
 * the product never claims live data it does not have.
 */
export function resolveCreditSource(): CreditSource {
  // const key = process.env.CREDIT_API_KEY;
  // if (key) return new AggregatorCreditSource(key); // FCRA-compliant live feed
  return demoCreditSource;
}
