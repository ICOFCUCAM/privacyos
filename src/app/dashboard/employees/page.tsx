import { UserCog } from "lucide-react";
import { Card, DataBadge, PageHeader, RiskBadge, Pill, SectionTitle, StatCard } from "@/components/ui";
import { SeverityBar } from "@/components/viz";
import { getModuleData } from "@/lib/data/modules";
import { timeAgo, titleCase } from "@/lib/ui";
import type { RiskLevel } from "@/lib/types";

export const metadata = { title: "Employee Exposure" };

export default async function EmployeesPage() {
  const moduleData = await getModuleData();
  const { employeeExposures, credentialLeaks } = moduleData;
  const levels: RiskLevel[] = ["low", "medium", "high", "critical"];
  const all = [...employeeExposures.map((e) => e.riskLevel), ...credentialLeaks.map((c) => c.riskLevel)];
  const counts: Partial<Record<RiskLevel, number>> = Object.fromEntries(
    levels.map((l) => [l, all.filter((x) => x === l).length]),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        icon={UserCog}
        title="Employee Exposure & Credential Leaks"
        subtitle="Exposed employee data and corporate credential leaks across breach and dark-web sources."
        actions={<DataBadge live={moduleData.live} />}
      />

      <Card>
        <SectionTitle title="Workforce risk distribution" subtitle={`${all.length} findings across employees & credentials`} />
        <SeverityBar counts={counts} />
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
          {([...levels].reverse()).map((l) => (
            <span key={l} className="flex items-center gap-1.5">
              <RiskBadge level={l} /> {counts[l] ?? 0}
            </span>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Employees exposed" value={employeeExposures.length} accent="text-risk-high" />
        <StatCard label="Credential leaks" value={credentialLeaks.length} accent="text-risk-critical" />
        <StatCard label="Critical" value={[...employeeExposures, ...credentialLeaks].filter((x) => x.riskLevel === "critical").length} accent="text-risk-critical" />
        <StatCard label="Accounts at risk" value={new Set(credentialLeaks.map((c) => c.account)).size} />
      </div>

      <Card className="p-0">
        <div className="border-b border-border p-5"><SectionTitle title="Credential leaks" subtitle="Corporate accounts found in breaches" /></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Account</th>
                <th className="px-5 py-3 font-medium">Breach</th>
                <th className="px-5 py-3 font-medium">Exposed data</th>
                <th className="px-5 py-3 font-medium">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {credentialLeaks.map((c) => (
                <tr key={c.id} className="hover:bg-bg-elevated/50">
                  <td className="px-5 py-3 font-mono text-white">{c.account}</td>
                  <td className="px-5 py-3 text-slate-300">{c.breachName}</td>
                  <td className="px-5 py-3"><div className="flex flex-wrap gap-1">{c.dataClasses.map((d) => <Pill key={d}>{d}</Pill>)}</div></td>
                  <td className="px-5 py-3"><RiskBadge level={c.riskLevel} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-0">
        <div className="border-b border-border p-5"><SectionTitle title="Employee exposures" /></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Employee</th>
                <th className="px-5 py-3 font-medium">Exposure</th>
                <th className="px-5 py-3 font-medium">Source</th>
                <th className="px-5 py-3 font-medium">Severity</th>
                <th className="px-5 py-3 font-medium">Detected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {employeeExposures.map((e) => (
                <tr key={e.id} className="hover:bg-bg-elevated/50">
                  <td className="px-5 py-3">
                    <p className="font-mono text-white">{e.employeeEmail}</p>
                    {e.employeeName && <p className="text-xs text-slate-500">{e.employeeName}</p>}
                  </td>
                  <td className="px-5 py-3 text-slate-300">{e.exposureType}</td>
                  <td className="px-5 py-3"><Pill>{titleCase(e.source)}</Pill></td>
                  <td className="px-5 py-3"><RiskBadge level={e.riskLevel} /></td>
                  <td className="px-5 py-3 text-slate-500">{timeAgo(e.detectedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
