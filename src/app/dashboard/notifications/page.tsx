import { Bell } from "lucide-react";
import { Card, RiskBadge, Pill, StatCard } from "@/components/ui";
import { getModuleData } from "@/lib/data/modules";
import { timeAgo, titleCase } from "@/lib/ui";

export default async function NotificationsPage() {
  const { notifications } = await getModuleData();
  const unread = notifications.filter((n) => !n.read);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="h-7 w-7 text-brand" />
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          <p className="mt-1 text-sm text-slate-400">Alerts, incidents, removals, reports and recommendations.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total" value={notifications.length} />
        <StatCard label="Unread" value={unread.length} accent="text-brand-fg" />
        <StatCard label="Critical" value={notifications.filter((n) => n.riskLevel === "critical").length} accent="text-risk-critical" />
        <StatCard label="Today" value={notifications.filter((n) => Date.now() - new Date(n.createdAt).getTime() < 86_400_000).length} />
      </div>

      <div className="space-y-2">
        {notifications.map((n) => (
          <Card key={n.id} className={n.read ? "opacity-70" : "ring-1 ring-brand/20"}>
            <div className="flex items-start gap-3">
              {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-white">{n.title}</p>
                  {n.riskLevel && <RiskBadge level={n.riskLevel} />}
                </div>
                <p className="mt-0.5 text-sm text-slate-400">{n.body}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Pill>{titleCase(n.kind)}</Pill>
                  <span className="text-xs text-slate-500">{timeAgo(n.createdAt)}</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
