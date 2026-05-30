import { Crown } from "lucide-react";
import { Card, RiskBadge, SectionTitle, StatCard } from "@/components/ui";
import { demoExposures, demoThreats } from "@/lib/data/demo";
import { titleCase } from "@/lib/ui";

export default function ExecutivePage() {
  const physical = demoThreats.filter((t) =>
    ["doxxing", "location_exposure"].includes(t.kind),
  );
  const addresses = demoExposures.filter((e) => e.category === "address");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Crown className="h-7 w-7 text-brand" />
        <div>
          <h1 className="text-2xl font-bold text-white">Executive Protection</h1>
          <p className="mt-1 text-sm text-slate-400">
            VIP-grade protection: doxxing, location exposure, family safety and personal threats.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Physical-security alerts" value={physical.length} accent="text-risk-critical" />
        <StatCard label="Address exposures" value={addresses.length} accent="text-risk-high" />
        <StatCard label="Family exposures" value={demoExposures.filter((e) => e.category === "family").length} />
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
