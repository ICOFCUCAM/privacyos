/**
 * Domain scan pipeline: resolve DNS signals for a domain and assess risks.
 * Best-effort with a deterministic fallback so it works offline; the DoH client
 * is injectable for tests.
 */

import { subjectDomain } from "@/lib/discovery/cert-transparency-connector";
import type { Subject } from "@/lib/types";
import { assessDomain, DohClient, type AssessedRisk } from "./dns";

export interface DomainScanResult {
  domain: string | null;
  risks: AssessedRisk[];
  live: boolean;
  log: string[];
}

export async function scanDomain(
  subject: Pick<Subject, "emails" | "organization">,
  client = new DohClient(),
): Promise<DomainScanResult> {
  const domain = subjectDomain(subject as Subject);
  if (!domain) {
    return { domain: null, risks: [], live: false, log: ["No corporate domain to scan."] };
  }

  try {
    const [apexTxt, dmarcTxt, mx] = await Promise.all([
      client.txt(domain),
      client.txt(`_dmarc.${domain}`),
      client.mx(domain),
    ]);
    const risks = assessDomain({ apexTxt, dmarcTxt, mx });
    return { domain, risks, live: true, log: [`Resolved DNS for ${domain}: ${risks.length} risk(s).`] };
  } catch {
    // Offline / blocked: assume a typical misconfiguration so the module is populated.
    const risks = assessDomain({ apexTxt: [], dmarcTxt: [], mx: [] });
    return { domain, risks, live: false, log: [`DNS unreachable for ${domain} — sample assessment.`] };
  }
}
