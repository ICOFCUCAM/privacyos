import Link from "next/link";
import { Trash2, RefreshCw, ShieldCheck, ArrowRight, Database } from "lucide-react";
import { buttonClasses, Card, PageHeader, SectionTitle } from "@/components/ui";
import { getDataSource } from "@/lib/data";
import { getEntitlements } from "@/lib/billing/subscription";
import { BROKERS } from "@/lib/brokers/registry";
import { brokerTable, coverageSummary, removalPipeline, type BrokerState } from "@/lib/brokers/intelligence";
import { cn, timeAgo } from "@/lib/ui";
import { fileRemovalAction, recheckRemovalAction } from "./actions";

export const metadata = { title: "Data Broker Removals" };

const STATE_META: Record<BrokerState, { label: string; cls: string; dot: string }> = {
  reappeared: { label: "Reappeared", cls: "text-risk-critical", dot: "bg-risk-critical" },
  in_progress: { label: "In progress", cls: "text-risk-medium", dot: "bg-risk-medium" },
  exposed: { label: "Exposure found", cls: "text-risk-high", dot: "bg-risk-high" },
  monitoring: { label: "Monitoring", cls: "text-risk-low", dot: "bg-risk-low" },
  removed: { label: "Removed", cls: "text-risk-low", dot: "bg-risk-low" },
  covered: { label: "Covered", cls: "text-slate-500", dot: "bg-slate-600" },
};

export default async function RemovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ limit?: string }>;
}) {
  const { limit: limitHit } = await searchParams;
  const ds = await getDataSource();
  const removals = await ds.listRemovals();
  const { brokerRemovalLimit } = await getEntitlements();

  const coverage = coverageSummary(removals);
  const pipeline = removalPipeline(removals);
  const rows = brokerTable(removals);
  const activeRows = rows.filter((r) => r.state !== "covered");

  const counted = removals.filter((r) =>
    ["removal_requested", "in_progress", "reappeared", "monitoring", "removed"].includes(r.status),
  ).length;
  const unlimited = !Number.isFinite(brokerRemovalLimit);
  const atLimit = !unlimited && counted >= brokerRemovalLimit;
  const maxPipeline = Math.max(1, ...pipeline.map((p) => p.count));

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Trash2}
        title="Data Broker Removals"
        subtitle={`Automated opt-outs with 30/60/90-day reappearance re-checks across ${coverage.totalBrokers} monitored brokers.`}
        actions={
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-elevated px-3 py-1.5 text-xs font-medium text-slate-300">
            <Database className="h-3.5 w-3.5 text-brand-fg" />
            {coverage.totalBrokers} brokers covered
          </span>
        }
      />

      {/* Coverage KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Kpi label="Brokers covered" value={String(coverage.totalBrokers)} icon={<ShieldCheck className="h-4 w-4 text-brand-fg" />} />
        <Kpi label="Exposures found" value={String(removals.length)} accent={removals.length ? "text-risk-high" : undefined} />
        <Kpi label="In progress" value={String(coverage.active)} accent="text-risk-medium" />
        <Kpi label="Protected" value={String(coverage.protectedCount)} accent="text-risk-low" hint={`${coverage.successRate}% success`} />
        <Kpi label="Reappeared" value={String(coverage.reappeared)} accent={coverage.reappeared ? "text-risk-critical" : undefined} />
      </div>

      {/* Removal pipeline */}
      <Card className="p-4">
        <SectionTitle title="Removal pipeline" subtitle="Every opt-out flows through the same monitored lifecycle" />
        <div className="flex items-stretch gap-1.5 overflow-x-auto">
          {pipeline.map((stage, i) => (
            <div key={stage.key} className="flex flex-1 items-center gap-1.5">
              <div className="flex-1 rounded-lg border border-border bg-bg-subtle/50 p-3 text-center">
                <p className={cn("text-2xl font-bold", stage.count > 0 ? "text-white" : "text-slate-600")}>{stage.count}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">{stage.label}</p>
                <div className="mx-auto mt-1.5 h-1 w-full overflow-hidden rounded-full bg-bg-subtle">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${(stage.count / maxPipeline) * 100}%` }} />
                </div>
              </div>
              {i < pipeline.length - 1 && <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-600" />}
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-slate-500">
          Re-checks at 30 / 60 / 90 days catch reappearances automatically — the Privacy Agent re-files any listing that returns.
        </p>
      </Card>

      {(atLimit || limitHit) && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-risk-high/30 bg-risk-high/10 px-4 py-3">
          <p className="text-sm text-risk-high">
            You&apos;ve reached your plan&apos;s broker-removal limit
            {Number.isFinite(brokerRemovalLimit) ? ` of ${brokerRemovalLimit}` : ""}. Upgrade for more (or unlimited) removals.
          </p>
          <Link href="/pricing#personal" className={buttonClasses("primary", "md", "shrink-0")}>Upgrade</Link>
        </div>
      )}

      {/* File a new opt-out */}
      <Card className="p-4">
        <SectionTitle title="File a new opt-out" subtitle="Pick a broker; the Privacy Agent handles submission and re-checks" />
        <form action={fileRemovalAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1">
            <span className="mb-1 block text-xs font-medium text-slate-400">Broker</span>
            <select name="brokerName" disabled={atLimit} className="w-full rounded-lg border border-border bg-bg-subtle px-3 py-2 text-sm text-white outline-none focus:border-brand disabled:opacity-50">
              {BROKERS.map((b) => <option key={b.id} value={b.name}>{b.name} · {b.category}</option>)}
            </select>
          </label>
          <button type="submit" disabled={atLimit} className={buttonClasses("primary", "md")}>
            <Trash2 className="h-4 w-4" /> File opt-out
          </button>
        </form>
      </Card>

      {/* Broker intelligence table */}
      <Card className="p-4">
        <SectionTitle
          title="Broker intelligence"
          subtitle={`${activeRows.length} active · ${coverage.totalBrokers - activeRows.length} monitored, clear`}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-slate-500">
                <th className="pb-2 font-medium">Broker</th>
                <th className="pb-2 font-medium">Category</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Last check</th>
                <th className="pb-2 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {/* Active rows first (full detail), then a condensed coverage tail */}
              {activeRows.map((r) => {
                const m = STATE_META[r.state];
                return (
                  <tr key={r.broker.id} className="text-slate-300">
                    <td className="py-2 font-medium text-white">{r.broker.name}</td>
                    <td className="py-2 text-slate-400">{r.broker.category}</td>
                    <td className="py-2">
                      <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold", m.cls)}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />
                        {m.label}
                      </span>
                    </td>
                    <td className="py-2 text-xs text-slate-500">{r.lastCheck ? timeAgo(r.lastCheck) : "—"}</td>
                    <td className="py-2 text-right">
                      {r.request && (
                        <form action={recheckRemovalAction} className="inline">
                          <input type="hidden" name="id" value={r.request.id} />
                          <button type="submit" className={buttonClasses("secondary", "sm")}>
                            <RefreshCw className="h-3 w-3" />
                            {r.state === "reappeared" ? "Re-submit" : "Re-check"}
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Coverage chips — the full monitored ecosystem */}
        <div className="mt-4 border-t border-border pt-3">
          <p className="mb-2 text-[11px] uppercase tracking-wide text-slate-500">
            Monitored ecosystem · {coverage.categories.map((c) => `${c.count} ${c.name.toLowerCase()}`).join(" · ")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {rows.filter((r) => r.state === "covered").map((r) => (
              <span key={r.broker.id} className="inline-flex items-center gap-1 rounded-md bg-bg-subtle px-2 py-0.5 text-[11px] text-slate-400 ring-1 ring-border">
                <span className="h-1 w-1 rounded-full bg-risk-low" />
                {r.broker.name}
              </span>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

function Kpi({ label, value, accent, hint, icon }: { label: string; value: string; accent?: string; hint?: string; icon?: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</span>
        {icon}
      </div>
      <p className={cn("mt-1 text-2xl font-bold text-white", accent)}>{value}</p>
      {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
    </Card>
  );
}
