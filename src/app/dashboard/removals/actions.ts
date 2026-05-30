"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDataSource } from "@/lib/data";
import { getEntitlements } from "@/lib/billing/subscription";
import { recordAudit } from "@/lib/audit/audit";

/** Active removals that count toward the plan's allowance (not yet fully removed). */
function countsTowardLimit(status: string): boolean {
  return ["removal_requested", "in_progress", "reappeared", "monitoring", "removed"].includes(status);
}

export async function fileRemovalAction(formData: FormData): Promise<void> {
  const brokerName = String(formData.get("brokerName") ?? "").trim();
  if (!brokerName) return;
  const exposureId = String(formData.get("exposureId") ?? "") || undefined;
  const ds = await getDataSource();

  // Enforce the plan's broker-removal allowance (10 / 50 / unlimited).
  const { brokerRemovalLimit } = await getEntitlements();
  if (Number.isFinite(brokerRemovalLimit)) {
    const existing = await ds.listRemovals();
    const active = existing.filter((r) => countsTowardLimit(r.status)).length;
    if (active >= brokerRemovalLimit) {
      await recordAudit({
        action: "removal.limit_reached",
        entity: "removal_request",
        metadata: { broker: brokerName, limit: brokerRemovalLimit },
      });
      redirect(`/dashboard/removals?limit=${brokerRemovalLimit}`);
    }
  }

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
