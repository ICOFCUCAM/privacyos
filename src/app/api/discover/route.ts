import { NextResponse } from "next/server";
import { getDataSource } from "@/lib/data";
import { runDiscovery } from "@/lib/discovery/pipeline";

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
  const data = await ds.getDataset();

  const finding = await runDiscovery({
    subject: data.subject,
    existing: data.exposures,
  });

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
