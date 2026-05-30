import Link from "next/link";
import { Trash2, RefreshCw } from "lucide-react";
import { Card, Pill, SectionTitle, StatCard } from "@/components/ui";
import { getDataSource } from "@/lib/data";
import { getEntitlements } from "@/lib/billing/subscription";
import { BROKERS } from "@/lib/brokers/registry";
import { cn, timeAgo, titleCase } from "@/lib/ui";
import type { ExposureStatus } from "@/lib/types";
import { fileRemovalAction, recheckRemovalAction } from "./actions";

const statusStyle: Record<string, string> = {
  removal_requested: "text-brand-fg",
  in_progress: "text-risk-medium",
  removed: "text-risk-low",
  monitoring: "text-risk-low",
  reappeared: "text-risk-critical",
};

const order: ExposureStatus[] = ["reappeared", "removal_requested", "in_progress", "monitoring", "removed"];

export default async function RemovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ limit?: string }>;
}) {
  const { limit: limitHit } = await searchParams;
  const ds = await getDataSource();
  const removals = await ds.listRemovals();
  const { brokerRemovalLimit } = await getEntitlements();
  const sorted = [...removals].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));

  const active = removals.filter((r) => ["removal_requested", "in_progress"].includes(r.status)).length;
  const removed = removals.filter((r) => ["removed", "monitoring"].includes(r.status)).length;
  const reappeared = removals.filter((r) => r.status === "reappeared").length;

  const counted = removals.filter((r) =>
    ["removal_requested", "in_progress", "reappeared", "monitoring", "removed"].includes(r.status),
  ).length;
  const unlimited = !Number.isFinite(brokerRemovalLimit);
  const atLimit = !unlimited && counted >= brokerRemovalLimit;
  const allowanceLabel = unlimited ? "Unlimited" : `${counted}/${brokerRemovalLimit}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Trash2 className="h-7 w-7 text-brand" />
        <div>
          <h1 className="text-2xl font-bold text-white">Data Broker Removals</h1>
          <p className="mt-1 text-sm text-slate-400">
            Automated opt-outs with 30/60/90-day reappearance re-checks across {BROKERS.length}+ brokers.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="In progress" value={active} accent="text-risk-medium" />
        <StatCard label="Removed / monitoring" value={removed} accent="text-risk-low" />
        <StatCard label="Reappeared" value={reappeared} accent="text-risk-critical" />
        <StatCard label="Plan allowance" value={allowanceLabel} accent={atLimit ? "text-risk-high" : undefined} hint={unlimited ? undefined : "Active removals used"} />
      </div>

      {(atLimit || limitHit) && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-risk-high/30 bg-risk-high/10 px-4 py-3">
          <p className="text-sm text-risk-high">
            You&apos;ve reached your plan&apos;s broker-removal limit
            {Number.isFinite(brokerRemovalLimit) ? ` of ${brokerRemovalLimit}` : ""}. Upgrade for more (or unlimited) removals.
          </p>
          <Link href="/pricing#personal" className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand/90">
            Upgrade
          </Link>
        </div>
      )}

      <Card>
        <SectionTitle title="File a new opt-out" subtitle="Pick a broker; the Privacy Agent handles submission and re-checks" />
        <form action={fileRemovalAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1">
            <span className="mb-1 block text-xs font-medium text-slate-400">Broker</span>
            <select name="brokerName" disabled={atLimit} className="w-full rounded-lg border border-border bg-bg-subtle px-3 py-2 text-sm text-white outline-none focus:border-brand disabled:opacity-50">
              {BROKERS.map((b) => <option key={b.id} value={b.name}>{b.name} · {b.category}</option>)}
            </select>
          </label>
          <button type="submit" disabled={atLimit} className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-50">
            <Trash2 className="h-4 w-4" /> File opt-out
          </button>
        </form>
      </Card>

      <div className="space-y-3">
        {sorted.map((r) => (
          <Card key={r.id} className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-white">{r.brokerName}</p>
                  <span className={cn("text-xs font-semibold", statusStyle[r.status])}>{titleCase(r.status)}</span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  Filed {timeAgo(r.submittedAt)}
                  {r.nextCheckAt && ` · next re-check ${timeAgo(r.nextCheckAt)}`}
                </p>
              </div>
              <form action={recheckRemovalAction}>
                <input type="hidden" name="id" value={r.id} />
                <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-bg-elevated">
                  <RefreshCw className="h-3.5 w-3.5" /> Run re-check
                </button>
              </form>
            </div>
            <ol className="space-y-2 border-l border-border pl-4">
              {r.history.slice().reverse().map((e, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-brand" />
                  <div className="flex items-center gap-2">
                    <Pill>{titleCase(e.status)}</Pill>
                    <span className="text-xs text-slate-500">{timeAgo(e.at)}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-400">{e.note}</p>
                </li>
              ))}
            </ol>
          </Card>
        ))}
      </div>
    </div>
  );
}
