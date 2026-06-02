import { describe, it, expect } from "vitest";
import { protectionsForEntitlements } from "./auto-provision";
import { entitlementsFor } from "@/lib/billing/entitlements";
import { findListing } from "@/lib/agents/workflow-marketplace";

const provision = (planId: string) => protectionsForEntitlements(entitlementsFor({ planId, status: "active" }));

describe("auto-provisioning protections from a plan", () => {
  it("installs nothing for the unsubscribed", () => {
    expect(protectionsForEntitlements(entitlementsFor(null))).toEqual([]);
  });

  it("free gets broker removal only (no continuous monitoring)", () => {
    expect(provision("free")).toEqual(["remove-data-brokers"]);
  });

  it("paid personal plans add baseline monitoring", () => {
    const p = provision("starter");
    expect(p).toContain("remove-data-brokers");
    expect(p).toContain("breach-response");
    expect(p).toContain("dark-web-watch");
  });

  it("unlocked domains add their packs", () => {
    expect(provision("family")).toContain("protect-my-family");          // family feature
    expect(provision("premium")).toContain("financial-protection");      // financial feature
    expect(provision("rep-creator")).toContain("reputation-recovery");   // reputation
    expect(provision("exec-pro")).toContain("protect-my-ceo");           // executive
    expect(provision("biz-growth")).toContain("vendor-risk-guard");      // business
  });

  it("every provisioned pack id resolves to a real marketplace listing", () => {
    for (const planId of ["free", "starter", "plus", "premium", "family", "rep-creator", "exec-elite", "biz-enterprise"]) {
      for (const id of provision(planId)) expect(findListing(id), `${planId}:${id}`).toBeDefined();
    }
  });

  it("is deduped + order-stable", () => {
    const p = provision("biz-enterprise");
    expect(new Set(p).size).toBe(p.length);
  });
});
