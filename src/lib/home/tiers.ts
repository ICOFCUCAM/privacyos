/**
 * Protection tier — the lens that decides how much depth a customer sees on
 * Protection Home. Personal gets pure outcomes; professional/executive/business
 * get a contextual card pointing at the depth their plan unlocks. Derived from
 * the subscription, so the autonomous face scales with the buyer. Pure + tested.
 */

export type ProtectionTier = "personal" | "professional" | "executive" | "business";

export function protectionTier(planId?: string | null): ProtectionTier {
  if (!planId) return "personal";
  if (planId.startsWith("biz")) return "business";
  if (planId.startsWith("exec")) return "executive";
  if (planId.startsWith("rep")) return "professional";
  return "personal";
}

export interface TierLens {
  tier: ProtectionTier;
  /** Card title shown on Protection Home. */
  title: string;
  subtitle: string;
  /** Where the card links. */
  href: string;
  cta: string;
}

export const TIER_LENS: Record<ProtectionTier, TierLens> = {
  personal: {
    tier: "personal",
    title: "Extend your protection",
    subtitle: "Add your family to your shield — we'll watch and remove their exposure too.",
    href: "/dashboard/family",
    cta: "Protect my family",
  },
  professional: {
    tier: "professional",
    title: "Reputation recovery active",
    subtitle: "We're monitoring your coverage and recovering your search results.",
    href: "/dashboard/reputation",
    cta: "View reputation",
  },
  executive: {
    tier: "executive",
    title: "Executive protection active",
    subtitle: "Residence, dark-web and threat-actor monitoring are running for you.",
    href: "/dashboard/executive",
    cta: "Open command center",
  },
  business: {
    tier: "business",
    title: "Organization posture",
    subtitle: "Employee, vendor and domain risk across your whole organization.",
    href: "/dashboard/mission-control",
    cta: "Open Mission Control",
  },
};

export function tierLens(planId?: string | null): TierLens {
  return TIER_LENS[protectionTier(planId)];
}
