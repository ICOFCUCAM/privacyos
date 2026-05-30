import { describe, expect, it } from "vitest";
import { requiredFeature } from "./gating";

describe("route gating map", () => {
  it("maps suite routes to their required feature", () => {
    expect(requiredFeature("/dashboard/reputation")).toBe("reputation");
    expect(requiredFeature("/dashboard/incidents")).toBe("executive");
    expect(requiredFeature("/dashboard/family")).toBe("executive");
    expect(requiredFeature("/dashboard/domains")).toBe("business");
    expect(requiredFeature("/dashboard/third-party")).toBe("business");
  });

  it("treats core routes as ungated", () => {
    expect(requiredFeature("/dashboard")).toBeNull();
    expect(requiredFeature("/dashboard/exposures")).toBeNull();
    expect(requiredFeature("/dashboard/settings")).toBeNull();
    expect(requiredFeature("/dashboard/agents")).toBeNull();
  });

  it("matches nested paths but not unrelated prefixes", () => {
    expect(requiredFeature("/dashboard/business/anything")).toBe("business");
    expect(requiredFeature("/dashboard/businessother")).toBeNull();
  });
});
