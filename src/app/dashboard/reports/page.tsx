import { FileText, ExternalLink } from "lucide-react";
import { Card, Pill } from "@/components/ui";
import { REPORT_TITLES } from "@/lib/reports/engine";
import type { ReportType } from "@/lib/suite-types";

const meta: Record<ReportType, { cadence: string; desc: string }> = {
  privacy: { cadence: "Monthly", desc: "Exposure inventory, removals and active threats." },
  executive: { cadence: "Weekly", desc: "VIP incidents, family exposure and physical-security posture." },
  business: { cadence: "Monthly", desc: "Credential leaks, domain risks and employee exposure." },
  threat: { cadence: "On alert", desc: "Active threats and open incidents with severity." },
  compliance: { cadence: "Monthly", desc: "Legal/privacy request status and audit trail." },
  risk: { cadence: "Weekly", desc: "Six-axis score breakdown and top risks." },
  board: { cadence: "Quarterly", desc: "Board-ready executive summary of overall posture." },
};

export default function ReportsPage() {
  const types = Object.keys(REPORT_TITLES) as ReportType[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Reports</h1>
        <p className="mt-1 text-sm text-slate-400">
          Generate executive, compliance and risk reports. Each opens a print-ready document — use your browser to Save as PDF.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {types.map((t) => (
          <Card key={t} className="flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/15">
                <FileText className="h-4 w-4 text-brand" />
              </div>
              <Pill>{meta[t].cadence}</Pill>
            </div>
            <div>
              <h2 className="font-semibold text-white">{REPORT_TITLES[t]}</h2>
              <p className="mt-1 text-sm text-slate-400">{meta[t].desc}</p>
            </div>
            <a
              href={`/api/reports/${t}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-bg-elevated"
            >
              <ExternalLink className="h-4 w-4" /> Generate report
            </a>
          </Card>
        ))}
      </div>
    </div>
  );
}
