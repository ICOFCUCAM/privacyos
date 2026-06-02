import { describe, expect, it } from "vitest";
import { requiredFeature, isOperatorRoute } from "./gating";

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
    expect(requiredFeature("/dashboard/reports")).toBeNull();
  });

  it("gates the automation operator surface", () => {
    expect(requiredFeature("/dashboard/workflow-builder")).toBe("automation");
    expect(requiredFeature("/dashboard/automation-templates")).toBe("automation");
    expect(requiredFeature("/dashboard/agents")).toBe("automation");
  });

  it("matches nested paths but not unrelated prefixes", () => {
    expect(requiredFeature("/dashboard/business/anything")).toBe("business");
    expect(requiredFeature("/dashboard/businessother")).toBeNull();
  });

  it("flags the internal company console as operator-only (and nothing else)", () => {
    expect(isOperatorRoute("/dashboard/business-intelligence")).toBe(true);
    expect(isOperatorRoute("/dashboard/business-intelligence/anything")).toBe(true);
    // the customer's own BusinessOS suite is NOT the operator console
    expect(isOperatorRoute("/dashboard/business")).toBe(false);
    expect(isOperatorRoute("/dashboard/home")).toBe(false);
  });
});
