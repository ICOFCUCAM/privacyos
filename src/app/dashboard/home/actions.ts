"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { PROVISIONED_COOKIE } from "@/lib/onboarding/auto-provision";

/** Dismiss the one-time "Protection activated" confirmation. */
export async function dismissProvisionedAction(): Promise<void> {
  (await cookies()).delete(PROVISIONED_COOKIE);
  revalidatePath("/dashboard/home");
}
