"use server";

import { redirect } from "next/navigation";
import { recordAudit } from "@/lib/audit/audit";
import { findListing, installListing } from "@/lib/agents/workflow-marketplace";
import { saveWorkflowAction } from "../actions";

/**
 * One-click install: instantiate a marketplace listing's backing templates into
 * the user's own workflow definitions, then drop them into the builder ready to
 * review and enable.
 */
export async function installListingAction(formData: FormData): Promise<void> {
  const listingId = String(formData.get("listingId") ?? "");
  const listing = findListing(listingId);
  if (!listing) return;

  for (const def of installListing(listing)) {
    await saveWorkflowAction(def);
  }
  await recordAudit({
    action: "workflow.installed",
    entity: "workflow_marketplace_listing",
    entityId: listing.id,
    metadata: { name: listing.name, workflows: listing.templateIds.length },
  });
  redirect("/dashboard/workflow-builder?from=marketplace");
}
