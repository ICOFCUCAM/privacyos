import { describe, expect, it } from "vitest";
import {
  ADMIN_ENTITLEMENTS, availableAgents, canRescan, DEMO_ENTITLEMENTS, entitlementsFor,
  FREE_ENTITLEMENTS, isAdminEmail, isEntitled, isOperator,
} from "./entitlements";

describe("isAdminEmail", () => {
  const env = { PRIVACYOS_ADMIN_EMAILS: "tchamer@aol.com, founder@privacyos.app" };
  it("matches an allowlisted email case-insensitively", () => {
    expect(isAdminEmail("tchamer@aol.com", env)).toBe(true);
    expect(isAdminEmail("TCHAMER@AOL.COM", env)).toBe(true);
    expect(isAdminEmail("  tchamer@aol.com ", env)).toBe(true);
  });
  it("rejects non-listed or empty emails", () => {
    expect(isAdminEmail("someone@else.com", env)).toBe(false);
    expect(isAdminEmail(null, env)).toBe(false);
    expect(isAdminEmail("tchamer@aol.com", {})).toBe(false); // no allowlist set
  });
});

describe("free tier", () => {
  it("grants the one-scan tier: 10 removals, no suites, entitled but planId 'free'", () => {
    expect(FREE_ENTITLEMENTS.planId).toBe("free");
    expect(FREE_ENTITLEMENTS.entitled).toBe(true); // so onboarding provisions broker removal
    expect(FREE_ENTITLEMENTS.brokerRemovalLimit).toBe(10);
    expect(Object.values(FREE_ENTITLEMENTS.features).some(Boolean)).toBe(false); // no suites
  });

  it("gates continuous scanning behind a paid plan", () => {
    expect(canRescan(FREE_ENTITLEMENTS)).toBe(false);            // free → blocked
    expect(canRescan(entitlementsFor(null))).toBe(false);        // unsubscribed → blocked
    expect(canRescan(entitlementsFor({ planId: "plus", status: "active" }))).toBe(true);
    expect(canRescan(DEMO_ENTITLEMENTS)).toBe(true);             // demo stays explorable
    expect(canRescan(ADMIN_ENTITLEMENTS)).toBe(true);
  });
});

describe("isOperator", () => {
  it("grants operator access to admins and pure demo, never to a real customer", () => {
    expect(isOperator(ADMIN_ENTITLEMENTS)).toBe(true);
    expect(isOperator(DEMO_ENTITLEMENTS)).toBe(true);
    expect(isOperator(entitlementsFor({ planId: "exec-pro", status: "active" }))).toBe(false);
    expect(isOperator(entitlementsFor(null))).toBe(false);
  });
});

describe("ADMIN_ENTITLEMENTS", () => {
  it("grants every feature + the full agent fleet", () => {
    expect(Object.values(ADMIN_ENTITLEMENTS.features).every(Boolean)).toBe(true);
    expect(ADMIN_ENTITLEMENTS.entitled).toBe(true);
    expect(availableAgents(ADMIN_ENTITLEMENTS).size).toBe(13);
  });
});

describe("entitlements", () => {
  it("treats active/trialing/past_due as entitled, others not", () => {
    expect(isEntitled("active")).toBe(true);
    expect(isEntitled("trialing")).toBe(true);
    expect(isEntitled("past_due")).toBe(true);
    expect(isEntitled("canceled")).toBe(false);
    expect(isEntitled("none")).toBe(false);
  });

  it("returns no entitlements for null / lapsed subscriptions", () => {
    expect(entitlementsFor(null).entitled).toBe(false);
    expect(entitlementsFor({ planId: "plus", status: "canceled" }).entitled).toBe(false);
  });

  it("sets broker removal limits by personal tier", () => {
    expect(entitlementsFor({ planId: "starter", status: "active" }).brokerRemovalLimit).toBe(10);
    expect(entitlementsFor({ planId: "plus", status: "active" }).brokerRemovalLimit).toBe(50);
    expect(entitlementsFor({ planId: "premium", status: "active" }).brokerRemovalLimit).toBe(Infinity);
  });

  it("unlocks the matching suite by category", () => {
    expect(entitlementsFor({ planId: "rep-creator", status: "active" }).features.reputation).toBe(true);
    expect(entitlementsFor({ planId: "exec-pro", status: "active" }).features.executive).toBe(true);
    expect(entitlementsFor({ planId: "biz-growth", status: "active" }).features.business).toBe(true);
  });

  it("automation (Workflow Builder/templates/playbooks) is power-user/enterprise only", () => {
    const has = (id: string) => entitlementsFor({ planId: id, status: "active" }).features.automation;
    // power-user / enterprise tiers
    for (const id of ["biz-growth", "biz-enterprise", "exec-elite", "ai-pro", "ai-enterprise"]) {
      expect(has(id), id).toBe(true);
    }
    // standard plans: automation runs behind the scenes, not exposed
    for (const id of ["free", "starter", "plus", "premium", "family", "exec-essential", "biz-startup", "ai-pack"]) {
      expect(has(id), id).toBe(false);
    }
  });

  it("the free plan grants 10 broker removals but no protection features (conversion tier)", () => {
    const e = entitlementsFor({ planId: "free", status: "active" });
    expect(e.entitled).toBe(true);
    expect(e.brokerRemovalLimit).toBe(10);
    for (const f of ["reputation", "executive", "business", "family", "ai_agent", "deep_web", "financial"] as const) {
      expect(e.features[f]).toBe(false);
    }
  });

  it("personal Plus/Premium/Family get reputation monitoring (no promise/gate gap)", () => {
    expect(entitlementsFor({ planId: "plus", status: "active" }).features.reputation).toBe(true);
    expect(entitlementsFor({ planId: "premium", status: "active" }).features.reputation).toBe(true);
    expect(entitlementsFor({ planId: "family", status: "active" }).features.reputation).toBe(true);
    expect(entitlementsFor({ planId: "starter", status: "active" }).features.reputation).toBe(false);
  });

  it("bundles the AI agent with higher personal tiers and the add-on", () => {
    expect(entitlementsFor({ planId: "plus", status: "active" }).features.ai_agent).toBe(true);
    expect(entitlementsFor({ planId: "starter", status: "active" }).features.ai_agent).toBe(false);
    expect(entitlementsFor({ planId: "ai-pro", status: "active" }).features.ai_agent).toBe(true);
  });

  it("grants family seats only on the Family plan", () => {
    expect(entitlementsFor({ planId: "family", status: "active" }).familySeats).toBe(6);
    expect(entitlementsFor({ planId: "premium", status: "active" }).familySeats).toBe(1);
    expect(entitlementsFor({ planId: "family", status: "active" }).features.family).toBe(true);
  });

  it("ignores unknown plan ids", () => {
    expect(entitlementsFor({ planId: "bogus", status: "active" }).entitled).toBe(false);
  });
});

describe("availableAgents", () => {
  it("brings the full fleet online in demo mode", () => {
    expect(availableAgents(DEMO_ENTITLEMENTS).size).toBe(13);
  });

  it("brings no agents online for a lapsed/none plan", () => {
    expect(availableAgents(entitlementsFor(null)).size).toBe(0);
  });

  it("always includes the core protection + coordination agents on any entitled plan", () => {
    const agents = availableAgents(entitlementsFor({ planId: "starter", status: "active" }));
    // Protection core
    expect(agents.has("discovery")).toBe(true);
    expect(agents.has("privacy")).toBe(true);
    expect(agents.has("security")).toBe(true);
    // Coordination roles run on every plan (they operate the fleet itself)
    expect(agents.has("orchestrator")).toBe(true);
    expect(agents.has("incident")).toBe(true);
    expect(agents.has("threat_intel")).toBe(true);
    // Starter has no AI add-on → legal/deepfake stay offline.
    expect(agents.has("legal")).toBe(false);
    expect(agents.has("deepfake")).toBe(false);
    // …and no business suite → compliance/vendor stay offline.
    expect(agents.has("compliance")).toBe(false);
    expect(agents.has("vendor")).toBe(false);
    expect(agents.size).toBe(6);
  });

  it("unlocks suite agents by feature", () => {
    const rep = availableAgents(entitlementsFor({ planId: "rep-creator", status: "active" }));
    expect(rep.has("reputation")).toBe(true);

    const exec = availableAgents(entitlementsFor({ planId: "exec-pro", status: "active" }));
    expect(exec.has("executive")).toBe(true);
    expect(exec.has("reputation")).toBe(true);

    const biz = availableAgents(entitlementsFor({ planId: "biz-growth", status: "active" }));
    expect(biz.has("business")).toBe(true);
    expect(biz.has("compliance")).toBe(true);
    expect(biz.has("vendor")).toBe(true);
  });

  it("unlocks legal + deepfake agents with the AI add-on / higher tiers", () => {
    const plus = availableAgents(entitlementsFor({ planId: "plus", status: "active" }));
    expect(plus.has("legal")).toBe(true);
    expect(plus.has("deepfake")).toBe(true);
  });
});
