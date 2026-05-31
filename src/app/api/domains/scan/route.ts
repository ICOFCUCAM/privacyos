import { NextResponse } from "next/server";
import { getDataSource } from "@/lib/data";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { scanDomain } from "@/lib/domains/scan";

/**
 * POST /api/domains/scan — assess the primary subject's corporate domain for
 * email-spoofing / DNS risks (SPF, DMARC, MX) via DNS-over-HTTPS, and persist a
 * `domains` row + fresh `domain_risks`. Keyless; falls back to a sample
 * assessment when DNS is unreachable. Demo mode returns results without storing.
 */
export async function POST() {
  const ds = await getDataSource();
  const subject = await ds.getPrimarySubject();
  if (!subject) return NextResponse.json({ error: "No subject to scan." }, { status: 400 });

  const result = await scanDomain(subject);
  if (!result.domain) {
    return NextResponse.json({ error: "No corporate domain found on this subject." }, { status: 400 });
  }

  let persisted = false;
  if (ds.live) {
    const db = await getSupabaseServerClient();
    const { data: { user } } = (await db?.auth.getUser()) ?? { data: { user: null } };
    if (db && user) {
      // Upsert the domain row, then replace its risks with the fresh scan.
      const { data: existing } = await db
        .from("domains")
        .select("id")
        .eq("domain", result.domain)
        .maybeSingle();
      let domainId = existing?.id as string | undefined;
      if (!domainId) {
        const { data: inserted } = await db
          .from("domains")
          .insert({ user_id: user.id, domain: result.domain, is_primary: true })
          .select("id")
          .single();
        domainId = inserted?.id;
      }
      if (domainId) {
        await db.from("domain_risks").delete().eq("domain_id", domainId);
        if (result.risks.length > 0) {
          await db.from("domain_risks").insert(
            result.risks.map((r) => ({
              user_id: user.id,
              domain_id: domainId,
              kind: r.kind,
              detail: r.detail,
              risk_level: r.riskLevel,
              resolved: false,
            })),
          );
        }
        persisted = true;
      }
    }
  }

  return NextResponse.json({
    persisted,
    domain: result.domain,
    source: result.live ? "dns" : "sample",
    risks: result.risks.length,
    log: result.log,
  });
}
