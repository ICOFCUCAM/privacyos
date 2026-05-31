import { NextResponse } from "next/server";
import { buildReportContext } from "@/lib/reports/build";
import { renderReport, REPORT_TITLES } from "@/lib/reports/engine";
import { renderReportPdf } from "@/lib/reports/pdf";
import type { ReportType } from "@/lib/suite-types";

/**
 * GET /api/reports/[type] — generate a report.
 *
 * Default: print-ready HTML. `?format=pdf` returns a real server-rendered PDF
 * (pdf-lib). Valid types: privacy, executive, business, threat, compliance,
 * risk, board.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ type: string }> },
) {
  const { type } = await params;
  if (!(type in REPORT_TITLES)) {
    return NextResponse.json({ error: `Unknown report type: ${type}` }, { status: 400 });
  }

  const ctx = await buildReportContext(type as ReportType);
  const format = new URL(req.url).searchParams.get("format");

  if (format === "pdf") {
    const bytes = await renderReportPdf(ctx);
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="privacyos-${type}-report.pdf"`,
      },
    });
  }

  return new NextResponse(renderReport(ctx), {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
