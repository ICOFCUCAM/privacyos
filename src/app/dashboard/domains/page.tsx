import { Globe } from "lucide-react";
import { Card, DataBadge, PageHeader, RiskBadge, Pill, SectionTitle, StatCard } from "@/components/ui";
import { RiskDonut, SeverityBar } from "@/components/viz";
import { DomainScanButton } from "@/components/domain-scan-button";
import { getModuleData } from "@/lib/data/modules";
import { timeAgo, titleCase } from "@/lib/ui";
import type { RiskLevel } from "@/lib/types";

export const metadata = { title: "Domain Monitoring" };

export default async function DomainsPage() {
  const moduleData = await getModuleData();
  const { domains, domainRisks } = moduleData;
  const open = domainRisks.filter((d) => !d.resolved);
  const levels: RiskLevel[] = ["low", "medium", "high", "critical"];
  const byLevel = levels.map((level) => ({ level, value: open.filter((d) => d.riskLevel === level).length }));
  const counts: Partial<Record<RiskLevel, number>> = Object.fromEntries(byLevel.map((b) => [b.level, b.value]));
  const byKind = open.reduce<Record<string, number>>((a, d) => ((a[d.kind] = (a[d.kind] ?? 0) + 1), a), {});
  const topKinds = Object.entries(byKind).sort((x, y) => y[1] - x[1]).slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Globe}
        title="Domain Monitoring"
        subtitle="Typosquats, spoofable mail, expiring certs, DNS takeover and exposed subdomains."
        actions={
          <div className="flex flex-col items-end gap-2">
            <DataBadge live={moduleData.live} />
            <DomainScanButton />
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Monitored domains" value={domains.length} />
        <StatCard label="Open risks" value={open.length} accent="text-risk-high" />
        <StatCard label="Typosquats" value={domainRisks.filter((d) => d.kind === "typosquat").length} accent="text-risk-high" />
        <StatCard label="Critical/High" value={open.filter((d) => ["high", "critical"].includes(d.riskLevel)).length} accent="text-risk-critical" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="flex items-center gap-5">
          <RiskDonut segments={byLevel} label="open risks" />
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
          <SectionTitle title="Risk severity" subtitle="Open domain & email-security risks" />
          <SeverityBar counts={counts} />
          <div className="mt-6 space-y-2">
            {topKinds.map(([kind, n]) => (
              <div key={kind} className="flex items-center gap-3">
                <span className="w-40 shrink-0 text-xs text-slate-400">{titleCase(kind)}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg-subtle">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${(n / (open.length || 1)) * 100}%` }} />
                </div>
                <span className="w-6 text-right text-xs text-slate-300">{n}</span>
              </div>
            ))}
          </div>
        </Card>
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
