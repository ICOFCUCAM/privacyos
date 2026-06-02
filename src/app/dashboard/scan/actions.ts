"use server";

import { recordAudit } from "@/lib/audit/audit";
import { getDataSource } from "@/lib/data";
import { buildScaryMirror, type ScaryMirrorReport } from "@/lib/home/scary-mirror";

/**
 * Run the activation scan ("Scary Mirror"). In demo mode this reads the
 * deterministic dataset; in live mode the discovery agents populate it. Either
 * way it returns the categorized exposure reveal + the auto-remediation plan.
 */
export async function runScaryMirrorAction(name: string): Promise<ScaryMirrorReport> {
  const ds = await getDataSource();
  const data = await ds.getDataset();
  const displayName = (name || data.subject.displayName || "you").trim();

  const report = buildScaryMirror({
    name: displayName.split(" ")[0] || "you",
    exposures: data.exposures,
    threats: data.threats,
  });

  await recordAudit({
    action: "activation.scan",
    entity: "subject",
    metadata: { findings: report.totalFindings, exposureScore: report.exposureScore },
  });

  return report;
}
