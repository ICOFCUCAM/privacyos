import { NextResponse } from "next/server";
import { buildReportContext } from "@/lib/reports/build";
import { renderReport, REPORT_TITLES } from "@/lib/reports/engine";
import type { ReportType } from "@/lib/suite-types";

/**
 * GET /api/reports/[type] — generates a print-ready HTML report.
 *
 * Opens in the browser; users can Save-as-PDF. Valid types: privacy, executive,
 * business, threat, compliance, risk, board.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ type: string }> },
) {
  const { type } = await params;
  if (!(type in REPORT_TITLES)) {
    return NextResponse.json({ error: `Unknown report type: ${type}` }, { status: 400 });
  }
  const ctx = await buildReportContext(type as ReportType);
  const html = renderReport(ctx);
  return new NextResponse(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
