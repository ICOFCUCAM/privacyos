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

describe("buildReportContext — board", () => {
  it("includes the cross-domain protection posture", async () => {
    const ctx = await buildReportContext("board");
    const headings = ctx.sections.map((s) => s.heading);
    expect(headings).toContain("Protection posture (all domains)");
    expect(ctx.stats.map((s) => s.label)).toContain("Domains at risk");
    // all six domains listed
    const posture = ctx.sections.find((s) => s.heading === "Protection posture (all domains)")!;
    expect(posture.rows).toHaveLength(6);
  });
});

describe("buildReportContext — identity", () => {
  it("renders the account inventory and restoration playbook", async () => {
    const ctx = await buildReportContext("identity");
    expect(ctx.stats[0].label).toBe("Identity risk");
    const headings = ctx.sections.map((s) => s.heading);
    expect(headings).toContain("Account inventory");
    expect(headings).toContain("Restoration playbook");
  });
});

describe("buildReportContext — business", () => {
  it("leads with the Brand Risk Score and brand impersonation", async () => {
    const ctx = await buildReportContext("business");
    expect(ctx.stats[0].label).toBe("Brand Risk Score");
    const headings = ctx.sections.map((s) => s.heading);
    expect(headings).toContain("Brand risk indices");
    expect(headings).toContain("Brand impersonation");
  });
});

describe("buildReportContext — travel", () => {
  it("renders destination intelligence, readiness and itinerary", async () => {
    const ctx = await buildReportContext("travel");
    const headings = ctx.sections.map((s) => s.heading);
    expect(headings).toContain("Destination intelligence");
    expect(headings).toContain("Pre-travel readiness");
    expect(headings).toContain("Itinerary");
    expect(ctx.stats.map((s) => s.label)).toContain("Readiness");
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
