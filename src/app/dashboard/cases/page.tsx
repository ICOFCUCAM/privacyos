import { Card, RiskBadge, Pill } from "@/components/ui";
import { getDataSource } from "@/lib/data";
import { timeAgo, titleCase } from "@/lib/ui";

export default async function CasesPage() {
  const { cases } = await (await getDataSource()).getDataset();
  const columns: { key: string; label: string }[] = [
    { key: "open", label: "Open" },
    { key: "in_progress", label: "In Progress" },
    { key: "awaiting_response", label: "Awaiting Response" },
    { key: "resolved", label: "Resolved" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Active Cases</h1>
        <p className="mt-1 text-sm text-slate-400">
          Remediation work, mostly driven autonomously by your agents.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {columns.map((col) => {
          const items = cases.filter(
            (c) => c.status === col.key || (col.key === "in_progress" && c.status === "escalated"),
          );
          return (
            <div key={col.key} className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold text-slate-300">{col.label}</h2>
                <span className="text-xs text-slate-500">{items.length}</span>
              </div>
              {items.map((c) => (
                <Card key={c.id} className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-white">{c.title}</p>
                    <RiskBadge level={c.riskLevel} />
                  </div>
                  <p className="text-xs text-slate-400">{c.summary}</p>
                  <div className="flex items-center justify-between">
                    <Pill>{titleCase(c.assignedAgent)} agent</Pill>
                    <span className="text-xs text-slate-500">{timeAgo(c.updatedAt)}</span>
                  </div>
                </Card>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
