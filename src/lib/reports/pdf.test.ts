import { describe, expect, it } from "vitest";
import { renderReportPdf } from "./pdf";
import type { ReportContext } from "./engine";

const ctx: ReportContext = {
  type: "board",
  subjectName: "Jordan Vance",
  organization: "Vance Capital",
  generatedAt: new Date().toISOString(),
  scores: { privacy: 61, identity: 40, reputation: 55, executive: 70, business: 48, overall: 58 },
  stats: [
    { label: "Active threats", value: 3 },
    { label: "Open incidents", value: 2 },
    { label: "Open cases", value: 4 },
    { label: "Overall risk", value: 58 },
  ],
  sections: [
    { heading: "Executive summary", rows: [{ label: "Overall posture", value: "58/100 risk" }] },
    { heading: "Top exposures", rows: Array.from({ length: 30 }, (_, i) => ({ label: `Source ${i}`, value: "High" })) },
  ],
};

describe("PDF report rendering", () => {
  it("produces a non-empty PDF document (valid %PDF header)", async () => {
    const bytes = await renderReportPdf(ctx);
    expect(bytes.length).toBeGreaterThan(1000);
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
  });

  it("paginates long content without throwing", async () => {
    const big: ReportContext = {
      ...ctx,
      sections: [{ heading: "Many", rows: Array.from({ length: 120 }, (_, i) => ({ label: `r${i}`, value: "x" })) }],
    };
    const bytes = await renderReportPdf(big);
    expect(bytes.length).toBeGreaterThan(1000);
  });
});
