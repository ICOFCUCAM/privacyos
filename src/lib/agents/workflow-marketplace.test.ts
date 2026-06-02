import { describe, it, expect } from "vitest";
import {
  MARKETPLACE_LISTINGS, findListing, featuredListings, installListing,
  listingSummary, listingTemplates, marketplaceStats,
} from "./workflow-marketplace";
import { validateWorkflow } from "./workflow-builder";

describe("workflow marketplace (Layer 13)", () => {
  it("offers the five named one-click packs", () => {
    for (const name of [
      "Protect My CEO", "Protect My Family", "Breach Response",
      "Reputation Recovery", "Remove Data Brokers",
    ]) {
      expect(MARKETPLACE_LISTINGS.some((l) => l.name === name), name).toBe(true);
    }
  });

  it("every listing resolves to real templates", () => {
    for (const l of MARKETPLACE_LISTINGS) {
      const templates = listingTemplates(l);
      expect(templates.length, l.name).toBe(l.templateIds.length);
    }
  });

  it("one-click install produces valid, editable workflow definitions", () => {
    for (const l of MARKETPLACE_LISTINGS) {
      const defs = installListing(l);
      expect(defs.length).toBe(l.templateIds.length);
      for (const def of defs) {
        expect(def.id).toBe("draft"); // fresh, editable
        expect(validateWorkflow(def).valid, `${l.name}: ${def.name}`).toBe(true);
      }
      // fresh, unique step ids across the install
      const ids = defs.flatMap((d) => d.steps.map((s) => s.id));
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("summarizes a listing's contents", () => {
    const ceo = findListing("protect-my-ceo")!;
    const s = listingSummary(ceo);
    expect(s.workflows).toBe(2);
    expect(s.steps).toBeGreaterThan(0);
    expect(s.agents.length).toBeGreaterThan(0);
    expect(s.riskReduction).toBeGreaterThan(0);
  });

  it("featured + stats summarize the storefront", () => {
    expect(featuredListings().length).toBeGreaterThanOrEqual(5);
    const stats = marketplaceStats();
    expect(stats.listings).toBe(MARKETPLACE_LISTINGS.length);
    expect(stats.totalInstalls).toBeGreaterThan(0);
    expect(stats.avgRating).toBeGreaterThan(4);
    expect(stats.avgRating).toBeLessThanOrEqual(5);
  });
});
