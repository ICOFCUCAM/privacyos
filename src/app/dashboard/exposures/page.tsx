import { Card, RiskBadge, Pill } from "@/components/ui";
import { demoExposures } from "@/lib/data/demo";
import { timeAgo, titleCase } from "@/lib/ui";

export default function ExposuresPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Exposure Inventory</h1>
        <p className="mt-1 text-sm text-slate-400">
          Every discoverable exposure connected to you, classified by risk and remediation status.
        </p>
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
              {demoExposures.map((e) => (
                <tr key={e.id} className="hover:bg-bg-elevated/50">
                  <td className="max-w-xs px-5 py-3">
                    <p className="font-medium text-white">{e.sourceName}</p>
                    <p className="truncate text-xs text-slate-500">{e.snippet}</p>
                  </td>
                  <td className="px-5 py-3 text-slate-300">{titleCase(e.category)}</td>
                  <td className="px-5 py-3"><Pill>{titleCase(e.source)}</Pill></td>
                  <td className="px-5 py-3"><RiskBadge level={e.riskLevel} /></td>
                  <td className="px-5 py-3 text-slate-300">{titleCase(e.status)}</td>
                  <td className="px-5 py-3 text-slate-500">{timeAgo(e.lastSeenAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
