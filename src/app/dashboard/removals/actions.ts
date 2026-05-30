"use server";

import { revalidatePath } from "next/cache";
import { getDataSource } from "@/lib/data";
import { recordAudit } from "@/lib/audit/audit";

export async function fileRemovalAction(formData: FormData): Promise<void> {
  const brokerName = String(formData.get("brokerName") ?? "").trim();
  if (!brokerName) return;
  const exposureId = String(formData.get("exposureId") ?? "") || undefined;
  const ds = await getDataSource();
  await ds.createRemoval(brokerName, exposureId);
  await recordAudit({ action: "removal.filed", entity: "removal_request", metadata: { broker: brokerName } });
  revalidatePath("/dashboard/removals");
}

export async function recheckRemovalAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const ds = await getDataSource();
  await ds.recheckRemoval(id);
  await recordAudit({ action: "removal.rechecked", entity: "removal_request", entityId: id });
  revalidatePath("/dashboard/removals");
}
