import { Users } from "lucide-react";
import { Card, RiskBadge, SectionTitle, StatCard } from "@/components/ui";

const familyMembers = [
  { name: "Alex Vance", relation: "Spouse", exposures: 4, risk: "high" as const },
  { name: "Mia Vance", relation: "Child (14)", exposures: 2, risk: "critical" as const },
  { name: "Theo Vance", relation: "Child (11)", exposures: 1, risk: "medium" as const },
  { name: "Eleanor Vance", relation: "Parent (72)", exposures: 3, risk: "high" as const },
];

export default function FamilyPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-7 w-7 text-brand" />
        <div>
          <h1 className="text-2xl font-bold text-white">Family Protection</h1>
          <p className="mt-1 text-sm text-slate-400">
            Protect children, parents and elderly relatives — data, photos, school and location exposure.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Members protected" value={familyMembers.length} />
        <StatCard label="Total exposures" value={familyMembers.reduce((s, m) => s + m.exposures, 0)} />
        <StatCard label="Minors monitored" value={2} accent="text-risk-high" hint="Heightened safeguards" />
        <StatCard label="School references" value={3} hint="Flagged for review" />
      </div>

      <Card>
        <SectionTitle title="Family members" />
        <ul className="divide-y divide-border">
          {familyMembers.map((m) => (
            <li key={m.name} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-muted text-xs font-semibold text-brand-fg">
                  {m.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{m.name}</p>
                  <p className="text-xs text-slate-500">{m.relation}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">{m.exposures} exposures</span>
                <RiskBadge level={m.risk} />
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
