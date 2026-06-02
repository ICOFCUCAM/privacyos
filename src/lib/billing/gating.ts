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
