import { describe, it, expect } from "vitest";
import { buildReportContext } from "./build";

describe("buildReportContext — executive", () => {
  it("surfaces the full ExecutiveOS picture", async () => {
    const ctx = await buildReportContext("executive");
    const headings = ctx.sections.map((s) => s.heading);
    expect(headings).toContain("Executive risk indices");
    expect(headings).toContain("Residence protection");
    expect(headings).toContain("Doxxing exposure");
    expect(headings).toContain("Threat actors");
    expect(headings).toContain("Impersonation & deepfake");
    expect(headings).toContain("Dark-web exposure");
    expect(headings).toContain("Attack paths");
    // the headline stat row includes live attack paths
    expect(ctx.stats.map((s) => s.label)).toContain("Live attack paths");

    // five named indices + four residence checks
    expect(ctx.sections.find((s) => s.heading === "Executive risk indices")!.rows).toHaveLength(5);
    expect(ctx.sections.find((s) => s.heading === "Residence protection")!.rows).toHaveLength(4);

    // the headline stat is the Executive Risk Score
    expect(ctx.stats[0].label).toBe("Executive Risk Score");
    expect(String(ctx.stats[0].value)).toMatch(/\/100$/);
  });
});

describe("buildReportContext — family", () => {
  it("renders registry, child safety, exposure tracking and risk propagation", async () => {
    const ctx = await buildReportContext("family");
    const headings = ctx.sections.map((s) => s.heading);
    expect(headings).toContain("Family registry");
    expect(headings).toContain("Child safety");
    expect(headings).toContain("Exposure tracking");
    expect(headings).toContain("Risk propagation");
    expect(ctx.stats.map((s) => s.label)).toContain("Child-safety alerts");
  });
});
