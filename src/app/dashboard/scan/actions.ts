"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { recordAudit } from "@/lib/audit/audit";
import { getDataSource } from "@/lib/data";
import { buildScaryMirror, type ScaryMirrorReport } from "@/lib/home/scary-mirror";
import { coerceMode, AUTONOMY_COOKIE, type AutonomyMode } from "@/lib/home/autonomy";
import { findListing, installListing } from "@/lib/agents/workflow-marketplace";
import { saveWorkflowAction } from "../workflow-builder/actions";

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

/**
 * Close the activation loop: record the chosen autonomy mode (the consent
 * contract) and auto-install the protection packs the fix plan named, then land
 * the customer in Protection Home where they're now running. In demo mode the
 * saves are no-ops, but the mode + the flow are real.
 */
export async function startProtectionAction(mode: AutonomyMode, packs: string[]): Promise<void> {
  const chosen = coerceMode(mode);

  const store = await cookies();
  store.set(AUTONOMY_COOKIE, chosen, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });

  const installed = new Set<string>();
  for (const id of packs) {
    if (!id || installed.has(id)) continue;
    const listing = findListing(id);
    if (!listing) continue;
    installed.add(id);
    for (const def of installListing(listing)) await saveWorkflowAction(def);
  }

  await recordAudit({
    action: "activation.protect",
    entity: "subject",
    metadata: { mode: chosen, packs: [...installed] },
  });

  redirect(`/dashboard/home?activated=${installed.size}`);
}
