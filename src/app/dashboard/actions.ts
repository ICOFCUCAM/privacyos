"use server";

import { revalidatePath } from "next/cache";
import { getDataSource } from "@/lib/data";

/** Acknowledge a threat from the threat feed. */
export async function acknowledgeThreatAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const ds = await getDataSource();
  await ds.acknowledgeThreat(id);
  revalidatePath("/dashboard/threats");
  revalidatePath("/dashboard");
}

/** Approve an agent recommendation. */
export async function approveRecommendationAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const ds = await getDataSource();
  await ds.approveRecommendation(id);
  revalidatePath("/dashboard/recommendations");
  revalidatePath("/dashboard");
}
