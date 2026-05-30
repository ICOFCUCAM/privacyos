import { UserCog } from "lucide-react";
import { Card, RiskBadge, Pill, SectionTitle, StatCard } from "@/components/ui";
import { getModuleData } from "@/lib/data/modules";
import { timeAgo, titleCase } from "@/lib/ui";

export default async function EmployeesPage() {
  const { employeeExposures, credentialLeaks } = await getModuleData();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <UserCog className="h-7 w-7 text-brand" />
        <div>
          <h1 className="text-2xl font-bold text-white">Employee Exposure & Credential Leaks</h1>
          <p className="mt-1 text-sm text-slate-400">
            Exposed employee data and corporate credential leaks across breach and dark-web sources.
          </p>
        </div>
      </div>

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
