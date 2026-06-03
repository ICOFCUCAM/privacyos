/**
 * Breach / credential-leak connector.
 *
 * Checks each of a subject's emails against breach databases and turns hits into
 * normalized exposures + threats. Uses the HaveIBeenPwned v3 API when
 * `HIBP_API_KEY` is configured, and otherwise a deterministic offline simulator
 * so the pipeline is exercisable and unit-testable with zero keys.
 */

import type { Exposure, RiskLevel, Subject, Threat } from "@/lib/types";
import {
  dedupeKey,
  type DiscoveryFinding,
  type DiscoveryInput,
  type DiscoverySource,
} from "./source";

export interface BreachRecord {
  name: string;
  title: string;
  breachDate: string;
  dataClasses: string[];
  pwnCount: number;
  isVerified: boolean;
  isSensitive: boolean;
}

const CRITICAL_CLASSES = [
  "Passwords",
  "Bank account numbers",
  "Credit cards",
  "Partial credit card data",
  "Social security numbers",
];
const HIGH_CLASSES = ["Security questions and answers", "Auth tokens", "Historical passwords"];

/** Classify breach severity from the exposed data classes. */
export function breachRiskLevel(dataClasses: string[]): RiskLevel {
  if (dataClasses.some((c) => CRITICAL_CLASSES.includes(c))) return "critical";
  if (dataClasses.some((c) => HIGH_CLASSES.includes(c))) return "high";
  if (dataClasses.includes("Email addresses") && dataClasses.length > 1) return "medium";
  return "low";
}

const RISK_SCORE: Record<RiskLevel, number> = { low: 8, medium: 20, high: 38, critical: 60 };

/** Stable small hash for deterministic offline simulation. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const SIM_CATALOG: Omit<BreachRecord, "pwnCount">[] = [
  { name: "LinkedIn", title: "LinkedIn", breachDate: "2021-06-01", dataClasses: ["Email addresses", "Passwords"], isVerified: true, isSensitive: false },
  { name: "Dropbox", title: "Dropbox", breachDate: "2012-07-01", dataClasses: ["Email addresses", "Passwords"], isVerified: true, isSensitive: false },
  { name: "Collection1", title: "Collection #1", breachDate: "2019-01-07", dataClasses: ["Email addresses", "Passwords"], isVerified: false, isSensitive: false },
  { name: "Canva", title: "Canva", breachDate: "2019-05-24", dataClasses: ["Email addresses", "Names", "Usernames"], isVerified: true, isSensitive: false },
  { name: "Adobe", title: "Adobe", breachDate: "2013-10-04", dataClasses: ["Email addresses", "Password hints", "Passwords"], isVerified: true, isSensitive: false },
];

/** Deterministic offline breach lookup keyed on the email string. */
export function simulateBreaches(email: string): BreachRecord[] {
  const h = hash(email.toLowerCase());
  const count = h % 4; // 0–3 breaches
  return Array.from({ length: count }, (_, i) => {
    const tpl = SIM_CATALOG[(h + i) % SIM_CATALOG.length];
    return { ...tpl, pwnCount: 1_000_000 + ((h + i) % 900) * 1_000_000 };
  });
}

export class BreachConnector implements DiscoverySource {
  readonly id = "breach_db";
  readonly name = "Breach Database Connector";

  constructor(private apiKey = process.env.HIBP_API_KEY) {}

  private async fetchBreaches(email: string): Promise<BreachRecord[]> {
    if (!this.apiKey) return simulateBreaches(email);
    const res = await fetch(
      `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`,
      { headers: { "hibp-api-key": this.apiKey, "user-agent": "PrivacyOS" } },
    );
    if (res.status === 404) return []; // not found in any breach
    if (!res.ok) throw new Error(`HIBP error ${res.status}`);
    const data = (await res.json()) as Array<{
      Name: string;
      Title: string;
      BreachDate: string;
      DataClasses: string[];
      PwnCount: number;
      IsVerified: boolean;
      IsSensitive: boolean;
    }>;
    return data
      // HIBP's verified-owner rule: never surface sensitive breaches (e.g. those
      // revealing sexuality/health/affiliation) unless ownership is verified.
      .filter((b) => !b.IsSensitive)
      .map((b) => ({
        name: b.Name,
        title: b.Title,
        breachDate: b.BreachDate,
        dataClasses: b.DataClasses,
        pwnCount: b.PwnCount,
        isVerified: b.IsVerified,
        isSensitive: b.IsSensitive,
      }));
  }

  async scan({ subject }: DiscoveryInput): Promise<DiscoveryFinding> {
    const exposures: Exposure[] = [];
    const threats: Threat[] = [];
    const log: string[] = [];
    const now = new Date().toISOString();

    for (const email of subject.emails) {
      let breaches: BreachRecord[];
      try {
        breaches = await this.fetchBreaches(email);
      } catch (err) {
        log.push(`breach lookup failed for ${email}: ${(err as Error).message}`);
        continue;
      }
      log.push(`${email}: ${breaches.length} breach(es) found.`);

      for (const b of breaches) {
        const level = breachRiskLevel(b.dataClasses);
        const isCredential = b.dataClasses.some((c) => CRITICAL_CLASSES.includes(c));
        const snippet = `${email} exposed in ${b.title} (${b.breachDate}) — ${b.dataClasses.join(", ")}`;

        const exposure: Exposure = {
          id: `brc-${hash(b.name + email)}`,
          subjectId: subject.id,
          category: isCredential ? "credential" : "email",
          source: "breach_db",
          sourceName: b.title,
          snippet,
          riskLevel: level,
          riskScore: RISK_SCORE[level],
          status: "discovered",
          discoveredAt: now,
          lastSeenAt: now,
        };
        exposures.push(exposure);

        // Credential-bearing breaches also raise an acute threat.
        if (level === "critical") {
          threats.push({
            id: `brt-${hash(b.name + email)}`,
            subjectId: subject.id,
            kind: "credential_leak",
            title: `Credentials exposed in ${b.title}`,
            detail: `${email} appears in the ${b.title} breach (${b.pwnCount.toLocaleString()} accounts). Exposed: ${b.dataClasses.join(", ")}.`,
            riskLevel: "critical",
            source: "breach_db",
            detectedAt: now,
            acknowledged: false,
          });
        }
      }
    }

    return { exposures, threats, log };
  }
}

export { dedupeKey };
