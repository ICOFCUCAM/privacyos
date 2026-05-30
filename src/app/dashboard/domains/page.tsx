import { Globe } from "lucide-react";
import { Card, DataBadge, RiskBadge, Pill, SectionTitle, StatCard } from "@/components/ui";
import { getModuleData } from "@/lib/data/modules";
import { timeAgo, titleCase } from "@/lib/ui";

export default async function DomainsPage() {
  const moduleData = await getModuleData();
  const { domains, domainRisks } = moduleData;
  const open = domainRisks.filter((d) => !d.resolved);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Globe className="h-7 w-7 text-brand" />
          <div>
            <h1 className="text-2xl font-bold text-white">Domain Monitoring</h1>
            <p className="mt-1 text-sm text-slate-400">
              Typosquats, spoofable mail, expiring certs, DNS takeover and exposed subdomains.
            </p>
          </div>
        </div>
        <DataBadge live={moduleData.live} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Monitored domains" value={domains.length} />
        <StatCard label="Open risks" value={open.length} accent="text-risk-high" />
        <StatCard label="Typosquats" value={domainRisks.filter((d) => d.kind === "typosquat").length} accent="text-risk-high" />
        <StatCard label="Critical/High" value={open.filter((d) => ["high", "critical"].includes(d.riskLevel)).length} accent="text-risk-critical" />
      </div>

      <Card>
        <SectionTitle title="Monitored domains" />
        <ul className="divide-y divide-border">
          {domains.map((d) => (
            <li key={d.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2">
                <p className="font-mono text-sm text-white">{d.domain}</p>
                {d.isPrimary && <Pill>Primary</Pill>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">{d.riskCount} risks</span>
                <RiskBadge level={d.highestRisk} />
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-0">
        <div className="border-b border-border p-5"><SectionTitle title="Domain risks" /></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Domain / asset</th>
                <th className="px-5 py-3 font-medium">Risk type</th>
                <th className="px-5 py-3 font-medium">Detail</th>
                <th className="px-5 py-3 font-medium">Severity</th>
                <th className="px-5 py-3 font-medium">Detected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {domainRisks.map((d) => (
                <tr key={d.id} className="hover:bg-bg-elevated/50">
                  <td className="px-5 py-3 font-mono text-white">{d.domain}</td>
                  <td className="px-5 py-3"><Pill>{titleCase(d.kind)}</Pill></td>
                  <td className="max-w-xs px-5 py-3 text-slate-400">{d.detail}</td>
                  <td className="px-5 py-3"><RiskBadge level={d.riskLevel} /></td>
                  <td className="px-5 py-3 text-slate-500">{timeAgo(d.detectedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
