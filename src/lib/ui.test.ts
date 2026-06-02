import { describe, it, expect } from "vitest";
import { cn, titleCase, timeAgo, riskBg } from "./ui";

describe("ui utilities", () => {
  it("cn merges + dedupes class names", () => {
    expect(cn("a", false && "b", "c")).toBe("a c");
    // tailwind-merge keeps the last conflicting utility
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("titleCase capitalizes snake/space words", () => {
    expect(titleCase("threat_intel")).toBe("Threat Intel");
    expect(titleCase("high risk")).toBe("High Risk");
  });

  it("timeAgo renders a relative string", () => {
    const now = Date.now();
    expect(timeAgo(new Date(now - 5 * 1000).toISOString())).toMatch(/just now|s ago|now/i);
    expect(timeAgo(new Date(now - 3 * 60 * 1000).toISOString())).toMatch(/m ago|min/i);
    expect(timeAgo(new Date(now - 2 * 60 * 60 * 1000).toISOString())).toMatch(/h ago|hour/i);
  });

  it("riskBg covers every risk level", () => {
    for (const k of ["low", "medium", "high", "critical"] as const) {
      expect(riskBg[k]).toBeTruthy();
    }
  });
});
