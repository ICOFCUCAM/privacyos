/**
 * Plan inclusions — derived from the real gating, not hand-written copy.
 *
 * The pricing page renders these so what a plan *advertises* and what the product
 * *enforces* can never drift: every inclusion is computed from `entitlementsFor`
 * and `creditPlanFor` (the same functions the dashboard gates on). Pure + tested.
 */

import { entitlementsFor } from "./entitlements";
import { creditPlanFor } from "@/lib/credit/plans";

export interface PlanInclusion {
  label: string;
  detail: string;
  included: boolean;
}

/** Everything a plan actually unlocks, derived from entitlements + credit tier. */
export function planInclusions(planId: string): PlanInclusion[] {
  const ent = entitlementsFor({ planId, status: "active" });
  const credit = creditPlanFor(planId);
  const brokers = !ent.entitled
    ? "—"
    : ent.brokerRemovalLimit === Infinity
      ? "Unlimited"
      : `${ent.brokerRemovalLimit}`;
  return [
    { label: "Autonomous response engine", detail: "Find → case → remove → evidence → legal → monitor", included: ent.entitled },
    { label: "Data-broker removals", detail: brokers, included: ent.entitled && ent.brokerRemovalLimit > 0 },
    { label: "Credit monitoring", detail: credit.level === "none" ? "—" : `${credit.bureaus}-bureau`, included: credit.level !== "none" },
    { label: "Reputation defense", detail: "Search · news · sentiment", included: ent.features.reputation },
    { label: "Executive protection", detail: "Doxxing · impersonation · threats", included: ent.features.executive },
    { label: "Business & org risk", detail: "Employees · domains · vendors", included: ent.features.business },
    { label: "Family protection", detail: ent.familySeats > 1 ? `${ent.familySeats} seats` : "Household", included: ent.features.family },
  ];
}

/** The three cross-plan-comparable facts shown compactly on a pricing card. */
export function cardInclusions(planId: string): PlanInclusion[] {
  const all = planInclusions(planId);
  const pick = (label: string) => all.find((i) => i.label === label)!;
  return [pick("Data-broker removals"), pick("Credit monitoring"), pick("Autonomous response engine")];
}
