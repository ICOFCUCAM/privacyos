import { Network } from "lucide-react";
import { Card, DataBadge, RiskBadge, Pill, StatCard } from "@/components/ui";
import { getModuleData } from "@/lib/data/modules";
import { timeAgo } from "@/lib/ui";

export default async function ThirdPartyPage() {
  const moduleData = await getModuleData();
  const { thirdPartyRisks } = moduleData;
  const avg = Math.round(thirdPartyRisks.reduce((s, v) => s + v.riskScore, 0) / (thirdPartyRisks.length || 1));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Network className="h-7 w-7 text-brand" />
          <div>
            <h1 className="text-2xl font-bold text-white">Third-Party Risk Intelligence</h1>
            <p className="mt-1 text-sm text-slate-400">
              Continuous risk assessment of vendors and partners with access to your data and brand.
            </p>
          </div>
        </div>
        <DataBadge live={moduleData.live} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Vendors assessed" value={thirdPartyRisks.length} />
        <StatCard label="High risk" value={thirdPartyRisks.filter((v) => ["high", "critical"].includes(v.riskLevel)).length} accent="text-risk-high" />
        <StatCard label="Avg risk score" value={avg} accent={avg >= 50 ? "text-risk-high" : "text-white"} />
        <StatCard label="Categories" value={new Set(thirdPartyRisks.map((v) => v.category)).size} />
      </div>

      <div className="space-y-3">
        {thirdPartyRisks.map((v) => (
          <Card key={v.id} className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-bg-subtle ring-1 ring-border">
              <span className="text-lg font-bold text-white">{v.riskScore}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-white">{v.vendorName}</p>
                <Pill>{v.category}</Pill>
                <RiskBadge level={v.riskLevel} />
              </div>
              <p className="mt-1 text-sm text-slate-400">{v.findings}</p>
              <p className="mt-1 text-xs text-slate-500">Assessed {timeAgo(v.assessedAt)}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
