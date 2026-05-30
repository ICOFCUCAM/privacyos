import { Card, RiskBadge, Pill } from "@/components/ui";
import { ScanButton } from "@/components/scan-button";
import { getDataSource } from "@/lib/data";
import { clusterExposures } from "@/lib/discovery/entity-resolution";
import { timeAgo, titleCase } from "@/lib/ui";

export default async function ExposuresPage() {
  const { exposures } = await (await getDataSource()).getDataset();
  // Entity resolution: one row per real-world entity, with merged source counts.
  const clusters = clusterExposures(exposures).sort((a, b) => b.representative.riskScore - a.representative.riskScore);
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Exposure Inventory</h1>
          <p className="mt-1 text-sm text-slate-400">
            {clusters.length} unique exposure{clusters.length === 1 ? "" : "s"}
            {exposures.length !== clusters.length && ` resolved from ${exposures.length} raw signals`} —
            classified by risk and remediation status.
          </p>
        </div>
        <ScanButton />
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
