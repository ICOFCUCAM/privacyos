import { Crown } from "lucide-react";
import { Card, PageHeader, RiskBadge, SectionTitle, StatCard } from "@/components/ui";
import { getDataSource } from "@/lib/data";
import { titleCase } from "@/lib/ui";

export default async function ExecutivePage() {
  const { exposures, threats } = await (await getDataSource()).getDataset();
  const physical = threats.filter((t) =>
    ["doxxing", "location_exposure"].includes(t.kind),
  );
  const addresses = exposures.filter((e) => e.category === "address");

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Crown}
        title="Executive Protection"
        subtitle="VIP-grade protection: doxxing, location exposure, family safety and personal threats."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Physical-security alerts" value={physical.length} accent="text-risk-critical" />
        <StatCard label="Address exposures" value={addresses.length} accent="text-risk-high" />
        <StatCard label="Family exposures" value={exposures.filter((e) => e.category === "family").length} />
        <StatCard label="Protection tier" value="Executive" accent="text-brand-fg" />
      </div>

      <Card>
        <SectionTitle title="Physical-security signals" subtitle="Stricter threshold for VIP subjects" />
        <ul className="space-y-3">
          {physical.map((t) => (
            <li key={t.id} className="flex items-start gap-3">
              <RiskBadge level={t.riskLevel} />
              <div>
                <p className="text-sm font-medium text-white">{t.title}</p>
                <p className="text-xs text-slate-400">{titleCase(t.kind)} · {t.detail}</p>
              </div>
            </li>
          ))}
          {physical.length === 0 && (
            <p className="text-sm text-slate-500">No active physical-security signals.</p>
          )}
        </ul>
      </Card>
    </div>
  );
}
