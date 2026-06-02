/**
 * Entitlements.
 *
 * Pure mapping from a subscription (plan + status) to what a user can access.
 * Used for dashboard plan-gating and limit display. Kept dependency-free and
 * unit-tested so gating decisions are explainable and never depend on IO.
 */

import type { PlanCategory } from "./plans";
import { PLANS } from "./plans";
import type { AgentKind } from "@/lib/types";

export type SubscriptionStatus =
  | "trialing" | "active" | "past_due" | "canceled" | "incomplete" | "unpaid" | "none";

export interface Subscription {
  planId: string;
  status: SubscriptionStatus;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
}

/** A status that grants access (paid/granted), vs. lapsed/none. */
export function isEntitled(status: SubscriptionStatus): boolean {
  return status === "active" || status === "trialing" || status === "past_due";
}

/** Feature keys that can be gated in the UI. */
export type Feature =
  | "reputation"
  | "executive"
  | "business"
  | "family"
  | "ai_agent"
  | "deep_web"
  | "priority_support"
  | "financial"
  | "automation";

export interface Entitlements {
  /** Active plan id, or null when unsubscribed/demo. */
  planId: string | null;
  category: PlanCategory | null;
  entitled: boolean;
  features: Record<Feature, boolean>;
  /** Max data-broker removals; Infinity = unlimited. */
  brokerRemovalLimit: number;
  /** Family member seats. */
  familySeats: number;
}

const NONE: Entitlements = {
  planId: null,
  category: null,
  entitled: false,
  features: {
    reputation: false, executive: false, business: false, family: false,
    ai_agent: false, deep_web: false, priority_support: false, financial: false, automation: false,
  },
  brokerRemovalLimit: 0,
  familySeats: 0,
};

/** Per-plan broker-removal allowances (personal tiers). */
const BROKER_LIMITS: Record<string, number> = {
  free: 10,
  starter: 10,
  plus: 50,
  premium: Infinity,
  family: Infinity,
};

/**
 * Demo / unauthenticated mode grants full read access so the product stays
 * fully explorable without a subscription. Live gating applies once a real
 * subscription is present.
 */
export const DEMO_ENTITLEMENTS: Entitlements = {
  planId: "demo",
  category: null,
  entitled: true,
  features: {
    reputation: true, executive: true, business: true, family: true,
    ai_agent: true, deep_web: true, priority_support: true, financial: true, automation: true,
  },
  brokerRemovalLimit: Infinity,
  familySeats: 6,
};

/**
 * Admin entitlements — full access to every suite and feature, unlimited
 * allowances. Granted to all-listed admin emails (see isAdminEmail) regardless
 * of subscription, so operators/founders can access the whole platform.
 */
export const ADMIN_ENTITLEMENTS: Entitlements = {
  planId: "admin",
  category: null,
  entitled: true,
  features: {
    reputation: true, executive: true, business: true, family: true,
    ai_agent: true, deep_web: true, priority_support: true, financial: true, automation: true,
  },
  brokerRemovalLimit: Infinity,
  familySeats: 6,
};

/**
 * Admin allowlist. Emails come from the PRIVACYOS_ADMIN_EMAILS env var
 * (comma-separated), so admins are configured without code changes and no
 * address is hard-coded into the bundle. Matching is case-insensitive.
 */
export function isAdminEmail(
  email: string | null | undefined,
  env: Record<string, string | undefined> = process.env,
): boolean {
  if (!email) return false;
  const allow = (env.PRIVACYOS_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allow.includes(email.trim().toLowerCase());
}

/** Resolve entitlements from a subscription (or null → unsubscribed). */
export function entitlementsFor(sub: Subscription | null): Entitlements {
  if (!sub || !isEntitled(sub.status)) return NONE;
  const plan = PLANS.find((p) => p.id === sub.planId);
  if (!plan) return NONE;

  const cat = plan.category;
  const personalTier = cat === "personal" ? sub.planId : null;

  return {
    planId: plan.id,
    category: cat,
    entitled: true,
    features: {
      // Full ReputationOS for the reputation category; personal Plus/Premium/
      // Family also advertise "Reputation Monitoring", so they're entitled too
      // (previously a promise/gate contradiction — sold but locked out).
      reputation: cat === "reputation" || (cat === "personal" && ["plus", "premium", "family"].includes(sub.planId)),
      executive: cat === "executive",
      business: cat === "business",
      // Family/deep-web are personal-tier perks (Premium & Family).
      family: cat === "personal" && (sub.planId === "premium" || sub.planId === "family"),
      deep_web: cat === "personal" && (sub.planId === "premium" || sub.planId === "family"),
      // AI agent is an add-on category, also bundled with higher tiers.
      ai_agent: cat === "ai_addon" || ["plus", "premium", "family"].includes(sub.planId),
      priority_support: ["premium", "family"].includes(sub.planId) ||
        ["executive", "business"].includes(cat),
      // Financial Exposure Protection: full for executive/business; monitoring
      // for the personal tiers that advertise "Identity Theft Monitoring".
      financial: cat === "executive" || cat === "business" ||
        (cat === "personal" && ["premium", "family"].includes(sub.planId)),
      // Automation is an OPERATOR capability (Workflow Builder, templates,
      // playbooks, agent orchestration) — reserved for power-user/enterprise
      // tiers. Standard plans get automation auto-configured behind the scenes.
      automation:
        ["biz-growth", "biz-enterprise", "biz-enterprise-plus", "exec-elite", "ai-pro", "ai-enterprise"].includes(sub.planId),
    },
    brokerRemovalLimit: personalTier ? (BROKER_LIMITS[personalTier] ?? 0) : Infinity,
    familySeats: sub.planId === "family" ? 6 : 1,
  };
}

/* ── Agent availability by plan ──────────────────────────────────────────── */

/** Every agent in the fleet — the demo/full roster. */
export const ALL_AGENT_KINDS: AgentKind[] = [
  "discovery", "privacy", "legal", "reputation", "security", "deepfake", "executive", "business",
  "orchestrator", "incident", "compliance", "threat_intel", "vendor",
];

/** Display name for each agent (the fleet's 13 agent blocks). */
export const AGENT_LABEL: Record<AgentKind, string> = {
  discovery: "Discovery Agent",
  privacy: "Privacy Agent",
  legal: "Legal Agent",
  reputation: "Reputation Agent",
  security: "Security Agent",
  deepfake: "Deepfake Agent",
  executive: "Executive Protection Agent",
  business: "Business Intelligence Agent",
  orchestrator: "Orchestrator Agent",
  incident: "Incident Response Agent",
  compliance: "Compliance Agent",
  threat_intel: "Threat Intelligence Agent",
  vendor: "Vendor Risk Agent",
};

/**
 * The agents always included with any active plan. Beyond core protection
 * (Discovery, Privacy, Security), the coordination roles — Orchestrator,
 * Incident Response and Threat Intelligence — run on every plan because they
 * operate the fleet itself.
 */
const CORE_AGENTS: AgentKind[] = [
  "discovery", "privacy", "security", "orchestrator", "incident", "threat_intel",
];

/** Which additional agents each feature/suite unlocks. */
const FEATURE_AGENTS: { feature: Feature; agents: AgentKind[] }[] = [
  { feature: "reputation", agents: ["reputation"] },
  { feature: "executive", agents: ["executive", "reputation"] },
  { feature: "business", agents: ["business", "compliance", "vendor"] },
  { feature: "ai_agent", agents: ["legal", "deepfake", "reputation"] },
];

/**
 * Resolve which agents are online for a given set of entitlements. Core agents
 * (protection + coordination roles) are always on for an entitled plan;
 * suite/add-on agents come online only when their feature is unlocked.
 * Demo/unauthenticated entitlements light up the full fleet so the product
 * stays fully explorable.
 */
export function availableAgents(ent: Entitlements): Set<AgentKind> {
  // Demo and admin: the full fleet online.
  if (ent.planId === "demo" || ent.planId === "admin") return new Set<AgentKind>(ALL_AGENT_KINDS);
  if (!ent.entitled) return new Set<AgentKind>();
  const set = new Set<AgentKind>(CORE_AGENTS);
  for (const { feature, agents } of FEATURE_AGENTS) {
    if (ent.features[feature]) agents.forEach((a) => set.add(a));
  }
  return set;
}
