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
