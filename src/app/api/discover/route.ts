import { NextResponse } from "next/server";
import { getDataSource } from "@/lib/data";
import { runDiscovery, defaultDiscoverySources } from "@/lib/discovery/pipeline";
import { interactiveSerpMeter } from "@/lib/discovery/serp-meter";
import { getEntitlements } from "@/lib/billing/subscription";
import { canRescan } from "@/lib/billing/entitlements";

/**
 * POST /api/discover — runs the discovery pipeline for the current user's
 * primary subject.
 *
 * Scans every configured discovery source (currently the breach-database
 * connector), dedupes findings against the known footprint, and — when live —
 * persists the new exposures + threats. In demo mode the findings are returned
 * but not stored. The breach connector uses HaveIBeenPwned when HIBP_API_KEY is
 * set, otherwise a deterministic simulator.
 */
export async function POST() {
  const ds = await getDataSource();
  const ent = await getEntitlements();

  // Continuous scanning is a paid capability. The free tier gets its single
  // onboarding scan; rescans convert to a plan. (Demo stays fully explorable.)
  if (ds.live && !canRescan(ent)) {
    return NextResponse.json(
      { error: "Continuous scanning is a paid feature — upgrade to keep watching.", upgrade: true },
      { status: 402 },
    );
  }

  const data = await ds.getDataset();

  const finding = await runDiscovery(
    {
      subject: data.subject,
      existing: data.exposures,
      existingThreats: data.threats,
      // Internal SerpApi budget backstop for this account.
      meter: await interactiveSerpMeter(ent.serpBudget),
    },
    // Gate + cache the paid SerpApi connectors by the user's plan.
    defaultDiscoverySources(ent),
  );

  if (ds.live) {
    await ds.persistDiscovery(finding);
  }

  return NextResponse.json({
    persisted: ds.live,
    newExposures: finding.exposures.length,
    newThreats: finding.threats.length,
    exposures: finding.exposures,
    threats: finding.threats,
    log: finding.log,
  });
}

export async function GET() {
  return NextResponse.json({
    service: "PrivacyOS discovery pipeline",
    usage: "POST /api/discover — scans configured sources for the primary subject",
  });
}
