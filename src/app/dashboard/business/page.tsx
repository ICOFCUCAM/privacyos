import { Building2, ShieldAlert } from "lucide-react";
import { Card, DataBadge, PageHeader, RiskBadge, SectionTitle, StatCard } from "@/components/ui";
import { getModuleData } from "@/lib/data/modules";
import { brandRiskIndices, brandImpersonation, BRAND_INDEX_META, type RiskBand, type BrandRiskIndices } from "@/lib/business/os/brand-os";
import { cn, titleCase } from "@/lib/ui";

export const metadata = { title: "Business Intelligence" };

const BAND: Record<RiskBand, { label: string; cls: string; ring: string; stroke: string }> = {
  low: { label: "Low", cls: "text-risk-low", ring: "ring-risk-low/30", stroke: "#22c55e" },
  elevated: { label: "Elevated", cls: "text-risk-medium", ring: "ring-risk-medium/30", stroke: "#eab308" },
  high: { label: "High", cls: "text-risk-high", ring: "ring-risk-high/30", stroke: "#f97316" },
  critical: { label: "Critical", cls: "text-risk-critical", ring: "ring-risk-critical/30", stroke: "#ef4444" },
};

function indexTone(v: number): string {
  return v >= 75 ? "text-risk-critical" : v >= 50 ? "text-risk-high" : v >= 25 ? "text-risk-medium" : "text-risk-low";
}

export default async function BusinessPage() {
  const data = await getModuleData();
  const { employeeExposures, credentialLeaks, domainRisks, thirdPartyRisks } = data;
  const openDomainRisks = domainRisks.filter((d) => !d.resolved);
  const impersonation = openDomainRisks.filter((d) => d.kind === "typosquat" || d.kind === "phishing");
  const brand = brandRiskIndices({ domainRisks, employeeExposures, thirdPartyRisks, credentialLeaks });
  const B = BAND[brand.band];
  const impersonationDomains = brandImpersonation(domainRisks).filter((d) => !d.resolved);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Building2}
        title="Business Intelligence"
        subtitle="Organization exposure: employee credentials, leaked assets, domain risks and brand impersonation."
        actions={<DataBadge live={data.live} />}
      />

      {/* Brand Risk Score */}
      <Card className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex shrink-0 items-center gap-4">
            <div className={cn("flex h-24 w-24 flex-col items-center justify-center rounded-full ring-4", B.ring)}>
              <span className={cn("text-3xl font-bold", B.cls)}>{brand.overall}</span>
              <span className="text-[10px] text-slate-400">brand risk</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Brand Risk Score</p>
              <p className={cn("text-xs font-semibold uppercase", B.cls)}>{B.label} risk</p>
              <p className="mt-1 text-xs text-slate-500">{impersonationDomains.length} impersonation domain(s) active</p>
            </div>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
            {BRAND_INDEX_META.map((m) => {
              const v = brand[m.key as keyof BrandRiskIndices] as number;
              return (
                <div key={m.key} className="rounded-xl border border-border bg-bg-subtle/40 p-3 text-center">
                  <p className={cn("text-2xl font-bold", indexTone(v))}>{v}</p>
                  <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">{m.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {impersonationDomains.length > 0 && (
        <Card className="p-4">
          <SectionTitle title="Brand impersonation" subtitle="Lookalike / phishing domains impersonating the brand" />
          <ul className="space-y-2">
            {impersonationDomains.map((d) => (
              <li key={d.domain} className="flex items-center gap-3 rounded-lg border border-border bg-bg-subtle/40 px-3 py-2">
                <ShieldAlert className="h-4 w-4 shrink-0 text-risk-high" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{d.domain}</p>
                  <p className="truncate text-[11px] text-slate-500">{titleCase(d.kind)} · {d.detail}</p>
                </div>
                <RiskBadge level={d.riskLevel} />
              </li>
            ))}
          </ul>
        </Card>
      )}

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
