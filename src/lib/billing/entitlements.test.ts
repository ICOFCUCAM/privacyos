import { describe, expect, it } from "vitest";
import { entitlementsFor, isEntitled } from "./entitlements";

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
