import { Card, PageHeader, RiskBadge, Pill, SectionTitle, StatCard } from "@/components/ui";
import { RiskDonut } from "@/components/viz";
import { getDataSource } from "@/lib/data";
import { timeAgo, titleCase } from "@/lib/ui";
import type { RiskLevel } from "@/lib/types";

export const metadata = { title: "Active Cases" };

export default async function CasesPage() {
  const { cases } = await (await getDataSource()).getDataset();
  const levels: RiskLevel[] = ["low", "medium", "high", "critical"];
  const byLevel = levels.map((level) => ({ level, value: cases.filter((c) => c.riskLevel === level).length }));
  const openCount = cases.filter((c) => c.status !== "resolved").length;
  const columns: { key: string; label: string }[] = [
    { key: "open", label: "Open" },
    { key: "in_progress", label: "In Progress" },
    { key: "awaiting_response", label: "Awaiting Response" },
    { key: "resolved", label: "Resolved" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Active Cases"
        subtitle="Remediation work, mostly driven autonomously by your agents."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="flex items-center gap-5">
          <RiskDonut segments={byLevel} label="cases" />
          <div className="space-y-1.5 text-sm">
            {([...levels].reverse()).map((l) => (
              <div key={l} className="flex items-center gap-2">
                <RiskBadge level={l} />
                <span className="text-slate-300">{byLevel.find((b) => b.level === l)?.value ?? 0}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <SectionTitle title="Case pipeline" subtitle={`${openCount} open · ${cases.length} total`} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {columns.map((col) => (
              <StatCard
                key={col.key}
                label={col.label}
                value={cases.filter((c) => c.status === col.key || (col.key === "in_progress" && c.status === "escalated")).length}
              />
            ))}
          </div>
        </Card>
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
