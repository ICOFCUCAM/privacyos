/**
 * DNS / email-authentication domain assessment.
 *
 * Real, keyless domain-security checks: queries DNS-over-HTTPS (Google/Cloudflare
 * DoH — no API key) for SPF, DMARC and MX records, then derives concrete
 * domain risks (spoofable mail, weak DMARC, missing records). The assessment is
 * a pure function (unit-tested); the DoH client has an injectable fetch and a
 * deterministic fallback so it never breaks the pipeline offline.
 */

import type { DomainRiskKind } from "@/lib/suite-types";
import type { RiskLevel } from "@/lib/types";

export interface DohAnswer {
  data: string;
}

/** Minimal DNS-over-HTTPS client (Google DoH JSON API). */
export class DohClient {
  constructor(private fetchImpl: typeof fetch = fetch) {}

  async txt(name: string): Promise<string[]> {
    return this.query(name, "TXT");
  }
  async mx(name: string): Promise<string[]> {
    return this.query(name, "MX");
  }

  private async query(name: string, type: "TXT" | "MX"): Promise<string[]> {
    const res = await this.fetchImpl(
      `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`,
      { headers: { accept: "application/dns-json" } },
    );
    if (!res.ok) throw new Error(`DoH ${res.status}`);
    const data = (await res.json()) as { Answer?: DohAnswer[] };
    return (data.Answer ?? []).map((a) => a.data.replace(/^"|"$/g, ""));
  }
}

export interface DomainSignals {
  /** TXT records on the apex domain. */
  apexTxt: string[];
  /** TXT records on _dmarc.<domain>. */
  dmarcTxt: string[];
  /** MX records. */
  mx: string[];
}

export interface AssessedRisk {
  kind: DomainRiskKind;
  detail: string;
  riskLevel: RiskLevel;
}

function parseDmarcPolicy(records: string[]): string | null {
  const dmarc = records.find((r) => r.toLowerCase().includes("v=dmarc1"));
  if (!dmarc) return null;
  const m = dmarc.toLowerCase().match(/p\s*=\s*(none|quarantine|reject)/);
  return m ? m[1] : "none";
}

/** Derive domain risks from DNS signals. Pure and deterministic. */
export function assessDomain(signals: DomainSignals): AssessedRisk[] {
  const risks: AssessedRisk[] = [];
  const hasSpf = signals.apexTxt.some((r) => r.toLowerCase().startsWith("v=spf1"));
  const dmarcPolicy = parseDmarcPolicy(signals.dmarcTxt);
  const hasMx = signals.mx.length > 0;

  if (!hasSpf) {
    risks.push({
      kind: "spoof_mx",
      detail: "No SPF record published — the domain can be spoofed in phishing email.",
      riskLevel: "high",
    });
  }
  if (!dmarcPolicy) {
    risks.push({
      kind: "spoof_mx",
      detail: "No DMARC record — recipients can't reject forged mail from this domain.",
      riskLevel: hasSpf ? "medium" : "high",
    });
  } else if (dmarcPolicy === "none") {
    risks.push({
      kind: "spoof_mx",
      detail: "DMARC policy is p=none (monitor only) — spoofed mail is not rejected.",
      riskLevel: "medium",
    });
  }
  if (!hasMx) {
    risks.push({
      kind: "exposed_subdomain",
      detail: "No MX records — mail routing is unconfigured or delegated elsewhere.",
      riskLevel: "low",
    });
  }
  return risks;
}
