/**
 * Auto-provisioning — turning a plan into running protection, automatically.
 *
 * Standard customers buy outcomes, not workflow software: when they pick a plan
 * and finish onboarding, the platform selects and enables the right protection
 * packs for their entitlements behind the scenes — no Workflow Builder, no
 * templates, no operator screens. This maps entitlements → marketplace pack ids
 * to install (enabled). Pure and unit-tested.
 */

import type { Entitlements } from "@/lib/billing/entitlements";

/**
 * The protection packs to auto-install for a set of entitlements. Everyone
 * entitled gets broker removal; paid plans add baseline monitoring; each
 * unlocked domain adds its pack. Deduped, order-stable.
 */
export function protectionsForEntitlements(ent: Entitlements): string[] {
  if (!ent.entitled) return [];
  const packs: string[] = ["remove-data-brokers"]; // incl. the free tier's 10 removals

  // Paid plans get continuous baseline monitoring; free does not.
  if (ent.planId !== "free") packs.push("breach-response", "dark-web-watch");

  if (ent.features.reputation) packs.push("reputation-recovery");
  if (ent.features.financial) packs.push("financial-protection");
  if (ent.features.family) packs.push("protect-my-family");
  if (ent.features.executive) packs.push("protect-my-ceo");
  if (ent.features.business) packs.push("vendor-risk-guard");

  return [...new Set(packs)];
}
