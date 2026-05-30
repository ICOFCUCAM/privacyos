import { Plane } from "lucide-react";
import { Card, RiskBadge, StatCard } from "@/components/ui";
import { getModuleData } from "@/lib/data/modules";

export default async function TravelPage() {
  const { travelAlerts } = await getModuleData();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Plane className="h-7 w-7 text-brand" />
        <div>
          <h1 className="text-2xl font-bold text-white">Travel Risk Alerts</h1>
          <p className="mt-1 text-sm text-slate-400">
            Pre-travel risk assessments correlating itinerary with active exposure and threat intelligence.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Upcoming trips" value={travelAlerts.length} />
        <StatCard label="Elevated risk" value={travelAlerts.filter((t) => t.riskLevel !== "low").length} accent="text-risk-high" />
        <StatCard label="Destinations" value={new Set(travelAlerts.map((t) => t.destination)).size} />
        <StatCard label="Active advisories" value={travelAlerts.length} />
      </div>

      <div className="space-y-3">
        {travelAlerts.map((t) => (
          <Card key={t.id} className="flex items-start gap-4">
            <RiskBadge level={t.riskLevel} />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-white">{t.destination}</p>
              {t.travelDate && <p className="text-xs text-slate-500">Travel date: {t.travelDate}</p>}
              <p className="mt-1 text-sm text-slate-400">{t.advisory}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
