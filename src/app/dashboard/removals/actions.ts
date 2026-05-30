"use server";

import { revalidatePath } from "next/cache";
import { getDataSource } from "@/lib/data";

export async function fileRemovalAction(formData: FormData): Promise<void> {
  const brokerName = String(formData.get("brokerName") ?? "").trim();
  if (!brokerName) return;
  const exposureId = String(formData.get("exposureId") ?? "") || undefined;
  const ds = await getDataSource();
  await ds.createRemoval(brokerName, exposureId);
  revalidatePath("/dashboard/removals");
}

export async function recheckRemovalAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const ds = await getDataSource();
  await ds.recheckRemoval(id);
  revalidatePath("/dashboard/removals");
}
