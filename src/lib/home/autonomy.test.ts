import { describe, it, expect } from "vitest";
import {
  AUTONOMY_MODES, AUTONOMY_META, needsApproval, defaultModeForPlan, coerceMode,
} from "./autonomy";

describe("autonomy mode (consent dial)", () => {
  it("offers three modes with approval floors low→high", () => {
    expect(AUTONOMY_MODES).toEqual(["autopilot", "hybrid", "advisor"]);
    expect(AUTONOMY_META.autopilot.approvalFloor).toBe("critical"); // most autonomous
    expect(AUTONOMY_META.hybrid.approvalFloor).toBe("high");
    expect(AUTONOMY_META.advisor.approvalFloor).toBe("low");        // least autonomous
  });

  it("thresholds what reaches the human per mode", () => {
    // Autopilot: only critical reaches you
    expect(needsApproval("high", "autopilot")).toBe(false);
    expect(needsApproval("critical", "autopilot")).toBe(true);
    // Hybrid: high and critical reach you
    expect(needsApproval("medium", "hybrid")).toBe(false);
    expect(needsApproval("high", "hybrid")).toBe(true);
    // Advisor: everything reaches you
    expect(needsApproval("low", "advisor")).toBe(true);
  });

  it("defaults the mode by subscription tier", () => {
    expect(defaultModeForPlan("starter")).toBe("autopilot");
    expect(defaultModeForPlan("plus")).toBe("autopilot");
    expect(defaultModeForPlan("exec-pro")).toBe("hybrid");
    expect(defaultModeForPlan("biz-growth")).toBe("advisor");
    expect(defaultModeForPlan(undefined)).toBe("autopilot");
  });

  it("coerces untrusted input safely", () => {
    expect(coerceMode("hybrid")).toBe("hybrid");
    expect(coerceMode("nonsense")).toBe("autopilot");
    expect(coerceMode(undefined, "advisor")).toBe("advisor");
  });
});
