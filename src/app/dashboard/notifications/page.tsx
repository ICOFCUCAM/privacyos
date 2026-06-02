import { Bell, CheckCheck } from "lucide-react";
import { buttonClasses, Card, PageHeader, RiskBadge, Pill, StatCard } from "@/components/ui";
import { getModuleData } from "@/lib/data/modules";
import { getDataSource } from "@/lib/data";
import { getEntitlements } from "@/lib/billing/subscription";
import { financialOverview, financialNotification } from "@/lib/financial/os/financial-os";
import { timeAgo, titleCase } from "@/lib/ui";
import { markAllReadAction } from "./actions";

export default async function NotificationsPage() {
  const mod = await getModuleData();
  let notifications = mod.notifications;

  // Surface a dedicated alert when financial exposure is critical (entitled only).
  const ent = await getEntitlements();
  if (ent.features.financial) {
    const { exposures, threats } = await (await getDataSource()).getDataset();
    const finAlert = financialNotification(financialOverview({ exposures, credentialLeaks: mod.credentialLeaks, threats }));
    if (finAlert) notifications = [finAlert, ...notifications];
  }
  const unread = notifications.filter((n) => !n.read);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Bell}
        title="Notifications"
        subtitle="Alerts, incidents, removals, reports and recommendations."
        actions={
          unread.length > 0 ? (
            <form action={markAllReadAction}>
              <button
                type="submit"
                className={buttonClasses("secondary", "md")}
              >
                <CheckCheck className="h-4 w-4" /> Mark all read
              </button>
            </form>
          ) : undefined
        }
      />

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
