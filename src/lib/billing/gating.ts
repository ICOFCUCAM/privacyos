/**
 * Feature gating map: which dashboard route prefixes require which entitlement
 * feature. Shared by the sidebar (lock styling) and the pages (upgrade gate),
 * so nav and page enforcement never drift. Routes not listed here are core and
 * always accessible (incl. Settings, so billing is always reachable).
 */

import type { Feature } from "./entitlements";

export interface GatedSuite {
  feature: Feature;
  label: string;
  /** Route prefixes covered by this gate. */
  prefixes: string[];
  /** Plan category to deep-link on the pricing page. */
  upsell: string;
}

export const GATED_SUITES: GatedSuite[] = [
  { feature: "financial", label: "Financial Exposure Protection", prefixes: ["/dashboard/financial"], upsell: "personal" },
  { feature: "reputation", label: "ReputationOS", prefixes: ["/dashboard/reputation"], upsell: "reputation" },
  {
    feature: "executive",
    label: "ExecutiveOS",
    prefixes: ["/dashboard/executive", "/dashboard/incidents", "/dashboard/family", "/dashboard/travel"],
    upsell: "executive",
  },
  {
    feature: "business",
    label: "BusinessOS",
    prefixes: ["/dashboard/business", "/dashboard/domains", "/dashboard/employees", "/dashboard/third-party", "/dashboard/team"],
    upsell: "business",
  },
  {
    // Automation is an operator capability — standard plans get it auto-configured
    // behind the scenes; only power-user/enterprise tiers build it directly.
    feature: "automation",
    label: "Automation & Workflows",
    prefixes: ["/dashboard/workflow-builder", "/dashboard/automation-templates", "/dashboard/workflows", "/dashboard/playbooks", "/dashboard/agents"],
    upsell: "business",
  },
];

/** The feature required for a given dashboard path, or null if it's core. */
export function requiredFeature(path: string): Feature | null {
  for (const suite of GATED_SUITES) {
    if (suite.prefixes.some((p) => path === p || path.startsWith(`${p}/`))) {
      return suite.feature;
    }
  }
  return null;
}

/**
 * Operator-only route prefixes — internal company surfaces (the SaaS Growth &
 * Revenue console with MRR/ARR/NRR/churn across the whole book of business).
 * These are NOT customer protection data and must never be reachable by a
 * customer account, even by typing the URL. Gated on operator/admin access.
 */
export const OPERATOR_PREFIXES = ["/dashboard/business-intelligence"];

export function isOperatorRoute(path: string): boolean {
  return OPERATOR_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}
