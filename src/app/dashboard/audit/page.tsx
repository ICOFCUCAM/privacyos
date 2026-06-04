import { ScrollText } from "lucide-react";
import { Card, PageHeader, Pill, SectionTitle, StatCard } from "@/components/ui";
import { LedgerTabs } from "@/components/ledger-tabs";
import { getAuditLog, describeAudit } from "@/lib/audit/audit";
import { timeAgo } from "@/lib/ui";

export default async function AuditPage() {
  const entries = await getAuditLog();
  const byUser = entries.filter((e) => e.actor === "user").length;
  const byAgent = entries.filter((e) => e.actor.startsWith("agent")).length;

  return (
    <div className="space-y-6">
      <LedgerTabs />
      <PageHeader
        icon={ScrollText}
        title="Compliance Center — Audit Log"
        subtitle="Append-only record of every protection action, for compliance and accountability."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Logged events" value={entries.length} />
        <StatCard label="User actions" value={byUser} />
        <StatCard label="Agent actions" value={byAgent} accent="text-brand-fg" />
        <StatCard label="Last 24h" value={entries.filter((e) => Date.now() - new Date(e.createdAt).getTime() < 86_400_000).length} />
      </div>

      <Card className="p-0">
        <div className="border-b border-border p-5"><SectionTitle title="Activity" subtitle="Most recent first" /></div>
        <ul className="divide-y divide-border">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center gap-3 px-5 py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-muted text-[10px] font-semibold text-brand-fg">
                {e.actor.startsWith("agent") ? "AI" : "U"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">{describeAudit(e)}</p>
                <p className="truncate text-xs text-slate-500">
                  {e.actor}
                  {Object.keys(e.metadata).length > 0 &&
                    ` · ${Object.entries(e.metadata).map(([k, v]) => `${k}: ${v}`).join(", ")}`}
                </p>
              </div>
              {e.entity && <Pill>{e.entity.replace(/_/g, " ")}</Pill>}
              <span className="shrink-0 text-xs text-slate-500">{timeAgo(e.createdAt)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
