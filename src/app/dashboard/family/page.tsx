import { Users } from "lucide-react";
import { Card, DataBadge, RiskBadge, SectionTitle, StatCard } from "@/components/ui";
import { RiskDonut } from "@/components/viz";
import { getModuleData } from "@/lib/data/modules";
import type { RiskLevel } from "@/lib/types";

export default async function FamilyPage() {
  const moduleData = await getModuleData();
  const { familyMembers } = moduleData;
  const minors = familyMembers.filter((m) => m.isMinor);
  const levels: RiskLevel[] = ["low", "medium", "high", "critical"];
  const byLevel = levels.map((level) => ({ level, value: familyMembers.filter((m) => m.riskLevel === level).length }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Users className="h-7 w-7 text-brand" />
          <div>
            <h1 className="text-2xl font-bold text-white">Family Protection</h1>
            <p className="mt-1 text-sm text-slate-400">
              Protect children, parents and elderly relatives — data, photos, school and location exposure.
            </p>
          </div>
        </div>
        <DataBadge live={moduleData.live} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Members protected" value={familyMembers.length} />
        <StatCard label="Total exposures" value={familyMembers.reduce((s, m) => s + m.exposuresCount, 0)} />
        <StatCard label="Minors monitored" value={minors.length} accent="text-risk-high" hint="Heightened safeguards" />
        <StatCard label="At elevated risk" value={familyMembers.filter((m) => m.riskLevel !== "low").length} accent="text-risk-high" />
      </div>

      <Card className="flex items-center gap-5">
        <RiskDonut segments={byLevel} label="members" />
        <div className="space-y-1.5 text-sm">
          {([...levels].reverse()).map((l) => (
            <div key={l} className="flex items-center gap-2">
              <RiskBadge level={l} />
              <span className="text-slate-300">{byLevel.find((b) => b.level === l)?.value ?? 0} member(s)</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle title="Family members" />
        <ul className="divide-y divide-border">
          {familyMembers.map((m) => (
            <li key={m.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-muted text-xs font-semibold text-brand-fg">
                  {m.displayName.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    {m.displayName}
                    {m.isMinor && <span className="ml-2 rounded bg-risk-high/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-risk-high">Minor</span>}
                  </p>
                  <p className="text-xs text-slate-500">{m.relation}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">{m.exposuresCount} exposures</span>
                <RiskBadge level={m.riskLevel} />
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
