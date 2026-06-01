import { Crosshair, AlertTriangle, Megaphone, Activity } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, PageHeader, RiskBadge, SectionTitle } from "@/components/ui";
import { getDataSource } from "@/lib/data";
import { buildThreatActors, summarizeActors, type Escalation } from "@/lib/executive/os/threat-actors";
import { cn, timeAgo, titleCase } from "@/lib/ui";
import { ExecutiveTabs } from "../tabs";

export const metadata = { title: "Executive — Threat Actors" };

const ESCALATION: Record<Escalation, { label: string; cls: string }> = {
  active: { label: "Active", cls: "text-risk-critical bg-risk-critical/10 ring-risk-critical/30" },
  rising: { label: "Rising", cls: "text-risk-high bg-risk-high/10 ring-risk-high/30" },
  low: { label: "Low", cls: "text-risk-medium bg-risk-medium/10 ring-risk-medium/30" },
  dormant: { label: "Dormant", cls: "text-slate-400 bg-bg-elevated ring-border" },
};

export default async function ThreatActorsPage() {
  const { threats } = await (await getDataSource()).getDataset();
  const actors = buildThreatActors(threats);
  const summary = summarizeActors(actors);

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Crosshair}
        title="Threat Actor Tracking"
        subtitle="Threats clustered into actor profiles with escalation tracking and harassment-campaign monitoring."
      />
      <ExecutiveTabs />

      <div className="grid grid-cols-3 gap-3">
        <Kpi label="Tracked actors" value={String(summary.actors)} icon={Crosshair} tone="text-white" />
        <Kpi label="Active / rising" value={String(summary.active)} icon={Activity} tone={summary.active > 0 ? "text-risk-high" : "text-risk-low"} />
        <Kpi label="Harassment campaigns" value={String(summary.harassmentCampaigns)} icon={Megaphone} tone={summary.harassmentCampaigns > 0 ? "text-risk-high" : "text-risk-low"} />
      </div>

      <Card className="p-4">
        <SectionTitle title="Actor profiles" subtitle="Most-escalated first — expand for the activity timeline" />
        {actors.length === 0 ? (
          <p className="text-sm text-slate-500">No active threat actors against the principal.</p>
        ) : (
          <ul className="space-y-2">
            {actors.map((a) => {
              const E = ESCALATION[a.escalation];
              return (
                <li key={a.id} className="rounded-xl border border-border bg-bg-subtle/40">
                  <details className="group">
                    <summary className="flex cursor-pointer list-none items-center gap-3 p-3.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-bg-elevated text-brand-fg ring-1 ring-border">
                        <Crosshair className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-white">{a.label}</p>
                          <RiskBadge level={a.highestRisk} />
                          {a.harassment && <span className="inline-flex items-center gap-1 rounded bg-risk-high/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-risk-high ring-1 ring-risk-high/30"><Megaphone className="h-3 w-3" /> Harassment</span>}
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {a.threatCount} threat{a.threatCount === 1 ? "" : "s"} · {a.kinds.map((k) => titleCase(k)).join(", ")}
                          {a.lastSeen && <> · last seen {timeAgo(a.lastSeen)}</>}
                        </p>
                      </div>
                      <span className={cn("shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1", E.cls)}>{E.label}</span>
                    </summary>
                    <div className="border-t border-border px-3.5 py-3">
                      <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        <AlertTriangle className="h-3.5 w-3.5" /> Activity timeline
                      </p>
                      <ol className="space-y-1.5">
                        {a.timeline.slice().reverse().map((ev, i) => (
                          <li key={i} className="flex items-center gap-2.5 text-xs">
                            <RiskBadge level={ev.riskLevel} />
                            <span className="min-w-0 flex-1 truncate text-slate-300">{ev.title}</span>
                            <span className="shrink-0 text-[10px] text-slate-500">{ev.at ? timeAgo(ev.at) : "—"}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Kpi({ label, value, icon: Icon, tone }: { label: string; value: string; icon: LucideIcon; tone?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</span>
        <Icon className="h-3.5 w-3.5 text-slate-500" />
      </div>
      <p className={cn("mt-1 text-2xl font-bold", tone)}>{value}</p>
    </Card>
  );
}
