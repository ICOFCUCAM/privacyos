"use server";

import { revalidatePath } from "next/cache";
import { getDataSource } from "@/lib/data";
import { recordAudit } from "@/lib/audit/audit";

/** Acknowledge a threat from the threat feed. */
export async function acknowledgeThreatAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const ds = await getDataSource();
  await ds.acknowledgeThreat(id);
  await recordAudit({ action: "threat.acknowledged", entity: "threat", entityId: id });
  revalidatePath("/dashboard/threats");
  revalidatePath("/dashboard");
}

/**
 * Resolve a "What needs you" item from Protection Home, inline — so the
 * customer approves an outcome where it's shown instead of being sent to an
 * operator page. Dispatches to the real persisted engine for the item's kind:
 * a recommendation opens a tracked case; a threat-triggered protection step is
 * marked handled so the autonomous workflow proceeds.
 */
export async function resolveNeedAction(formData: FormData): Promise<void> {
  const kind = String(formData.get("kind") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const ds = await getDataSource();
  if (kind === "recommendation") {
    await ds.approveRecommendation(id);
    await recordAudit({ action: "recommendation.approved", entity: "recommendation", entityId: id });
  } else if (kind === "threat") {
    await ds.acknowledgeThreat(id);
    await recordAudit({ action: "protection.approved", entity: "threat", entityId: id });
  } else {
    return;
  }
  revalidatePath("/dashboard/home");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/cases");
  revalidatePath("/dashboard/threats");
}

/** Approve an agent recommendation. */
export async function approveRecommendationAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const ds = await getDataSource();
  await ds.approveRecommendation(id);
  await recordAudit({ action: "recommendation.approved", entity: "recommendation", entityId: id });
  // Approval opens a tracked case, so refresh the cases view too.
  revalidatePath("/dashboard/recommendations");
  revalidatePath("/dashboard/cases");
  revalidatePath("/dashboard");
}
