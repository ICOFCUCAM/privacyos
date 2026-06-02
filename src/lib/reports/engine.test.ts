import { describe, it, expect } from "vitest";
import { renderReport, type ReportContext } from "./engine";
import type { ScoreSet } from "@/lib/suite-types";

const scores: ScoreSet = { privacy: 40, identity: 30, reputation: 46, executive: 20, business: 16, overall: 34 };

const ctx: ReportContext = {
  type: "executive",
  subjectName: "Jordan Avery",
  organization: "Avery Capital",
  generatedAt: "2026-02-01T00:00:00Z",
  scores,
  stats: [{ label: "Exposures", value: 12 }, { label: "Removed", value: 5 }],
  sections: [{ heading: "Findings", rows: [{ label: "Home address", value: "exposed on 3 brokers" }] }],
};

describe("report engine", () => {
  it("renders a report containing the subject, stats and sections", () => {
    const out = renderReport(ctx);
    expect(out).toContain("Jordan Avery");
    expect(out).toContain("Avery Capital");
    expect(out).toContain("Findings");
    expect(out).toContain("Home address");
    expect(out).toContain("Exposures");
  });

  it("renders with no optional organization", () => {
    const out = renderReport({ ...ctx, organization: undefined });
    expect(out).toContain("Jordan Avery");
    expect(out.length).toBeGreaterThan(0);
  });
});
