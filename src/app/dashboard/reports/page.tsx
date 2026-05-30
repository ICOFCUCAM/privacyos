import { FileText, Download } from "lucide-react";
import { Card, Pill } from "@/components/ui";

const reports = [
  { title: "Executive Risk Report", cadence: "Weekly", desc: "Board-ready summary of posture, threats and remediation progress." },
  { title: "Compliance Report", cadence: "Monthly", desc: "GDPR/CCPA request status, evidence trail and audit log." },
  { title: "Privacy Report", cadence: "Monthly", desc: "Exposure inventory, removals completed and reappearances." },
  { title: "Dark Web Report", cadence: "On alert", desc: "Credential leaks, severity classification and recovery guidance." },
  { title: "Reputation Report", cadence: "Weekly", desc: "Sentiment trend, search visibility and recovery actions." },
  { title: "Annual Risk Review", cadence: "Annual", desc: "Year-over-year exposure trend and program effectiveness." },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Reports</h1>
        <p className="mt-1 text-sm text-slate-400">
          Generate executive, compliance and risk reports as PDF — scheduled or on demand.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reports.map((r) => (
          <Card key={r.title} className="flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/15">
                <FileText className="h-4 w-4 text-brand" />
              </div>
              <Pill>{r.cadence}</Pill>
            </div>
            <div>
              <h2 className="font-semibold text-white">{r.title}</h2>
              <p className="mt-1 text-sm text-slate-400">{r.desc}</p>
            </div>
            <button className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-bg-elevated">
              <Download className="h-4 w-4" /> Generate PDF
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}
