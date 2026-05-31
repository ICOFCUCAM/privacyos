import { Card, PageHeader, RiskBadge, Pill, SectionTitle } from "@/components/ui";
import { RiskDonut, SeverityBar } from "@/components/viz";
import { ScanButton } from "@/components/scan-button";
import { getDataSource } from "@/lib/data";
import { clusterExposures } from "@/lib/discovery/entity-resolution";
import { cn, timeAgo, titleCase } from "@/lib/ui";
import type { RiskLevel } from "@/lib/types";

export const metadata = { title: "Exposures" };

export default async function ExposuresPage() {
  const { exposures } = await (await getDataSource()).getDataset();
  // Entity resolution: one row per real-world entity, with merged source counts.
  const clusters = clusterExposures(exposures).sort((a, b) => b.representative.riskScore - a.representative.riskScore);

  const levels: RiskLevel[] = ["low", "medium", "high", "critical"];
  const byLevel = levels.map((level) => ({ level, value: clusters.filter((c) => c.representative.riskLevel === level).length }));
  const counts: Partial<Record<RiskLevel, number>> = Object.fromEntries(byLevel.map((b) => [b.level, b.value]));
  const removed = clusters.filter((c) => c.representative.status === "removed").length;
  const active = clusters.length - removed;
  const bySource = clusters.reduce<Record<string, number>>((acc, c) => {
    acc[c.representative.source] = (acc[c.representative.source] ?? 0) + 1;
    return acc;
  }, {});
  const topSources = Object.entries(bySource).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exposure Inventory"
        subtitle={`${clusters.length} unique exposure${clusters.length === 1 ? "" : "s"}${
          exposures.length !== clusters.length ? ` resolved from ${exposures.length} raw signals` : ""
        } — classified by risk and remediation status.`}
        actions={<ScanButton />}
      />

      {/* Visual summary */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="flex items-center gap-5">
          <RiskDonut segments={byLevel} label="exposures" />
          <div className="space-y-1.5 text-sm">
            {([...levels].reverse()).map((l) => (
              <div key={l} className="flex items-center gap-2">
                <RiskBadge level={l} />
                <span className="text-slate-300">{counts[l] ?? 0}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <SectionTitle title="Severity distribution" subtitle={`${active} active · ${removed} removed`} />
          <SeverityBar counts={counts} />
          <div className="mt-6">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Top sources</p>
            <div className="space-y-2">
              {topSources.map(([src, n]) => (
                <div key={src} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 text-xs text-slate-400">{titleCase(src)}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg-subtle">
                    <div className={cn("h-full rounded-full bg-brand")} style={{ width: `${(n / clusters.length) * 100}%` }} />
                  </div>
                  <span className="w-6 text-right text-xs text-slate-300">{n}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Exposure</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium">Source</th>
                <th className="px-5 py-3 font-medium">Risk</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Last seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {clusters.map((c) => {
                const e = c.representative;
                return (
                  <tr key={c.id} className="hover:bg-bg-elevated/50">
                    <td className="max-w-xs px-5 py-3">
                      <p className="font-medium text-white">{e.sourceName}</p>
                      <p className="truncate text-xs text-slate-500">{e.snippet}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-300">{titleCase(e.category)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <Pill>{titleCase(e.source)}</Pill>
                        {c.sources.length > 1 && <Pill>+{c.sources.length - 1} sources</Pill>}
                      </div>
                    </td>
                    <td className="px-5 py-3"><RiskBadge level={e.riskLevel} /></td>
                    <td className="px-5 py-3 text-slate-300">{titleCase(e.status)}</td>
                    <td className="px-5 py-3 text-slate-500">{timeAgo(e.lastSeenAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
