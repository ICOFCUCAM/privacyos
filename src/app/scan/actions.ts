"use server";

import { cookies } from "next/headers";
import { recordAudit } from "@/lib/audit/audit";
import { getDataSource } from "@/lib/data";
import { buildScaryMirror } from "@/lib/home/scary-mirror";
import { freeAssessment, type FreeAssessment } from "@/lib/home/free-assessment";
import { classifyProtection, type ProtectionRecommendation } from "@/lib/home/protection-profile";

const FREE_SCAN_COOKIE = "po_free_scan";

export interface FreeScanResult {
  /** True when the visitor has already used their one free scan → upgrade to rescan. */
  locked: boolean;
  assessment?: FreeAssessment;
  /** Silent profiling → the single most appropriate plan + remaining-risk math. */
  recommendation?: ProtectionRecommendation;
}

/**
 * Run the one free exposure assessment. The free tier is a conversion engine,
 * not a usage tier: a visitor gets ONE scan; a cookie records it, and any
 * rescan returns `locked` so the customer must upgrade. No signup required.
 */
export async function runFreeAssessmentAction(name: string): Promise<FreeScanResult> {
  const store = await cookies();
  if (store.get(FREE_SCAN_COOKIE)) {
    return { locked: true };
  }

  const displayName = (name || "you").trim().split(" ")[0] || "you";
  const { exposures, threats } = await (await getDataSource()).getDataset();
  const report = buildScaryMirror({ name: displayName, exposures, threats });
  const assessment = freeAssessment(report);
  const recommendation = classifyProtection(report);

  // One scan only — lock further scans behind an upgrade for a year.
  store.set(FREE_SCAN_COOKIE, "1", { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  await recordAudit({
    action: "free.assessment",
    entity: "subject",
    metadata: { exposures: assessment.totalExposures, protectionScore: assessment.protectionScore },
  });

  return { locked: false, assessment, recommendation };
}
