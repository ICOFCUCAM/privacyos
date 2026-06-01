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

    // five named indices + four residence checks
    expect(ctx.sections.find((s) => s.heading === "Executive risk indices")!.rows).toHaveLength(5);
    expect(ctx.sections.find((s) => s.heading === "Residence protection")!.rows).toHaveLength(4);

    // the headline stat is the Executive Risk Score
    expect(ctx.stats[0].label).toBe("Executive Risk Score");
    expect(String(ctx.stats[0].value)).toMatch(/\/100$/);
  });
});
