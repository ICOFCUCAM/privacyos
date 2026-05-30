import { Building2 } from "lucide-react";
import { Card, DataBadge, RiskBadge, SectionTitle, StatCard } from "@/components/ui";
import { getModuleData } from "@/lib/data/modules";
import { titleCase } from "@/lib/ui";

export default async function BusinessPage() {
  const data = await getModuleData();
  const { employeeExposures, credentialLeaks, domainRisks, thirdPartyRisks } = data;
  const openDomainRisks = domainRisks.filter((d) => !d.resolved);
  const impersonation = openDomainRisks.filter((d) => d.kind === "typosquat" || d.kind === "phishing");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Building2 className="h-7 w-7 text-brand" />
          <div>
            <h1 className="text-2xl font-bold text-white">Business Intelligence</h1>
            <p className="mt-1 text-sm text-slate-400">
              Organization exposure: employee credentials, leaked assets, domain risks and brand impersonation.
            </p>
          </div>
        </div>
        <DataBadge live={data.live} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Employees exposed" value={employeeExposures.length} accent="text-risk-critical" />
        <StatCard label="Credential leaks" value={credentialLeaks.length} accent="text-risk-high" />
        <StatCard label="Impersonation signals" value={impersonation.length} />
        <StatCard label="Domain risks" value={openDomainRisks.length} hint={impersonation.length ? "Typosquat detected" : undefined} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle title="Exposed employees" subtitle="Credential & inbox exposure" />
          <ul className="divide-y divide-border">
            {employeeExposures.map((e) => (
              <li key={e.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-mono text-sm text-white">{e.employeeEmail}</p>
                  <p className="text-xs text-slate-500">{e.exposureType}</p>
                </div>
                <RiskBadge level={e.riskLevel} />
              </li>
            ))}
            {employeeExposures.length === 0 && (
              <li className="py-3 text-sm text-slate-500">No exposed employees detected.</li>
            )}
          </ul>
        </Card>

        <Card>
          <SectionTitle title="Domain & brand risks" subtitle="Typosquats, spoofing and exposed assets" />
          <ul className="divide-y divide-border">
            {openDomainRisks.map((d) => (
              <li key={d.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-white">{titleCase(d.kind)}</p>
                  <p className="text-xs text-slate-500">{d.domain} — {d.detail}</p>
                </div>
                <RiskBadge level={d.riskLevel} />
              </li>
            ))}
            {openDomainRisks.length === 0 && (
              <li className="py-3 text-sm text-slate-500">No open domain risks.</li>
            )}
          </ul>
        </Card>
      </div>

      <Card>
        <SectionTitle title="Third-party risk" subtitle="Vendors and partners assessed" />
        <ul className="divide-y divide-border">
          {thirdPartyRisks.map((t) => (
            <li key={t.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-white">{t.vendorName}</p>
                <p className="text-xs text-slate-500">{t.category} — {t.findings}</p>
              </div>
              <RiskBadge level={t.riskLevel} />
            </li>
          ))}
          {thirdPartyRisks.length === 0 && (
            <li className="py-3 text-sm text-slate-500">No third-party risks assessed.</li>
          )}
        </ul>
      </Card>
    </div>
  );
}
