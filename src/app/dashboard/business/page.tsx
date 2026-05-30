import { Building2 } from "lucide-react";
import { Card, RiskBadge, SectionTitle, StatCard } from "@/components/ui";

const exposedEmployees = [
  { name: "m.chen@vancecapital.com", type: "Credential leak", risk: "critical" as const },
  { name: "s.patel@vancecapital.com", type: "Credential leak", risk: "high" as const },
  { name: "ops@vancecapital.com", type: "Exposed inbox", risk: "high" as const },
];

const assets = [
  { label: "Impersonating domain", detail: "vancecapltal.com (typosquat)", risk: "high" as const },
  { label: "Leaked document", detail: "Q3 board deck on paste site", risk: "critical" as const },
  { label: "Fake LinkedIn page", detail: "Unofficial 'Vance Capital' profile", risk: "medium" as const },
];

export default function BusinessPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Building2 className="h-7 w-7 text-brand" />
        <div>
          <h1 className="text-2xl font-bold text-white">Business Intelligence</h1>
          <p className="mt-1 text-sm text-slate-400">
            Organization exposure: employee credentials, leaked assets, domain risks and brand impersonation.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Employees exposed" value={exposedEmployees.length} accent="text-risk-critical" />
        <StatCard label="Leaked assets" value={assets.length} accent="text-risk-high" />
        <StatCard label="Impersonation signals" value={2} />
        <StatCard label="Domain risks" value={1} hint="Typosquat detected" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle title="Exposed employees" subtitle="Credential & inbox exposure" />
          <ul className="divide-y divide-border">
            {exposedEmployees.map((e) => (
              <li key={e.name} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-mono text-sm text-white">{e.name}</p>
                  <p className="text-xs text-slate-500">{e.type}</p>
                </div>
                <RiskBadge level={e.risk} />
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <SectionTitle title="Exposed assets & brand" />
          <ul className="divide-y divide-border">
            {assets.map((a) => (
              <li key={a.label} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-white">{a.label}</p>
                  <p className="text-xs text-slate-500">{a.detail}</p>
                </div>
                <RiskBadge level={a.risk} />
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
