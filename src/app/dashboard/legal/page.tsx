import { Scale, Download } from "lucide-react";
import { Card, PageHeader, Pill, SectionTitle, StatCard } from "@/components/ui";
import { getModuleData } from "@/lib/data/modules";
import { LEGAL_TYPE_LABELS } from "@/lib/legal/engine";
import { cn, timeAgo, titleCase } from "@/lib/ui";
import type { LegalRequestStatus, LegalRequestType } from "@/lib/suite-types";

export const metadata = { title: "Legal Automation" };

const statusStyle: Record<LegalRequestStatus, string> = {
  draft: "text-slate-400",
  ready: "text-brand-fg",
  submitted: "text-risk-medium",
  acknowledged: "text-risk-medium",
  completed: "text-risk-low",
  rejected: "text-risk-critical",
  escalated: "text-risk-high",
};

export default async function LegalPage() {
  const { legalRequests } = await getModuleData();
  const types = Object.keys(LEGAL_TYPE_LABELS) as LegalRequestType[];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Scale}
        title="Legal Automation"
        subtitle="Generate GDPR/CCPA requests, broker opt-outs, defamation complaints, platform-abuse and privacy-violation notices."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Requests" value={legalRequests.length} />
        <StatCard label="Completed" value={legalRequests.filter((l) => l.status === "completed").length} accent="text-risk-low" />
        <StatCard label="In flight" value={legalRequests.filter((l) => ["submitted", "acknowledged"].includes(l.status)).length} accent="text-risk-medium" />
        <StatCard label="Escalated" value={legalRequests.filter((l) => l.status === "escalated").length} accent="text-risk-high" />
      </div>

      <Card>
        <SectionTitle title="Generate a document" subtitle="Produces a ready-to-send draft you can download" />
        <form action="/api/legal" method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1">
            <span className="mb-1 block text-xs font-medium text-slate-400">Document type</span>
            <select name="type" className="w-full rounded-lg border border-border bg-bg-subtle px-3 py-2 text-sm text-white outline-none focus:border-brand" defaultValue="gdpr_erasure">
              {types.map((t) => <option key={t} value={t}>{LEGAL_TYPE_LABELS[t]}</option>)}
            </select>
          </label>
          <label className="flex-1">
            <span className="mb-1 block text-xs font-medium text-slate-400">Recipient</span>
            <input name="recipient" placeholder="e.g. Spokeo" className="w-full rounded-lg border border-border bg-bg-subtle px-3 py-2 text-sm text-white outline-none focus:border-brand" />
          </label>
          <label className="flex-1">
            <span className="mb-1 block text-xs font-medium text-slate-400">Matter (optional)</span>
            <input name="matter" placeholder="e.g. home address listing" className="w-full rounded-lg border border-border bg-bg-subtle px-3 py-2 text-sm text-white outline-none focus:border-brand" />
          </label>
          <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand/90">
            <Download className="h-4 w-4" /> Generate
          </button>
        </form>
      </Card>

      <Card className="p-0">
        <div className="border-b border-border p-5"><SectionTitle title="Requests" subtitle="Tracked submissions and responses" /></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Recipient</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Updated</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {legalRequests.map((l) => (
                <tr key={l.id} className="hover:bg-bg-elevated/50">
                  <td className="px-5 py-3"><Pill>{LEGAL_TYPE_LABELS[l.type]}</Pill></td>
                  <td className="px-5 py-3 text-white">{l.recipient}</td>
                  <td className={cn("px-5 py-3 font-medium", statusStyle[l.status])}>{titleCase(l.status)}</td>
                  <td className="px-5 py-3 text-slate-500">{timeAgo(l.updatedAt)}</td>
                  <td className="px-5 py-3 text-right">
                    <a href={`/api/legal?type=${l.type}&recipient=${encodeURIComponent(l.recipient)}`} className="text-xs font-medium text-brand-fg hover:underline">Download</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
