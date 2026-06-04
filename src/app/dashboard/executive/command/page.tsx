import Link from "next/link";
import { LayoutGrid, Grid3x3, BarChart3, Clock, ShieldCheck, AlertTriangle, ArrowRight } from "lucide-react";
import { Card, PageHeader, RiskBadge, SectionTitle } from "@/components/ui";
import { getDataSource } from "@/lib/data";
import { getModuleData } from "@/lib/data/modules";
import { exposureHeatMap, exposureGraph, threatTimeline } from "@/lib/executive/os/command";
import { residenceReport } from "@/lib/executive/os/residence";
import { doxxingReport } from "@/lib/executive/os/doxxing";
import { impersonationReport } from "@/lib/executive/os/impersonation";
import { darkWebReport } from "@/lib/executive/os/darkweb";
import { buildThreatActors, summarizeActors } from "@/lib/executive/os/threat-actors";
import { protectionCoverage, summarizeCoverage } from "@/lib/executive/os/coverage";
import { cn, timeAgo, titleCase } from "@/lib/ui";
import type { RiskLevel } from "@/lib/types";
import { ExecutiveTabs } from "../tabs";

export const metadata = { title: "Executive — Command" };

const LEVELS: RiskLevel[] = ["low", "medium", "high", "critical"];
const CELL: Record<RiskLevel, string> = {
  low: "bg-risk-low", medium: "bg-risk-medium", high: "bg-risk-high", critical: "bg-risk-critical",
};
const BAR: Record<RiskLevel, string> = {
  low: "bg-risk-low", medium: "bg-risk-medium", high: "bg-risk-high", critical: "bg-risk-critical",
};

export default async function CommandPage() {
  const { exposures, threats } = await (await getDataSource()).getDataset();
  const { incidents, domainRisks, credentialLeaks, familyMembers, travelAlerts } = await getModuleData();
  const heat = exposureHeatMap(exposures);
  const graph = exposureGraph(exposures);
  const timeline = threatTimeline(threats);
  const maxBar = Math.max(1, ...graph.map((g) => g.count));

  // Protection-coverage rollup across every pillar.
  const coverage = protectionCoverage({
    residenceExposed: residenceReport(exposures).exposedCount,
    doxxingLeaks: doxxingReport({ exposures, threats, family: familyMembers, employees: [] }).total,
    impersonationActive: impersonationReport({ threats, incidents, domainRisks, exposures }).active,
    darkWebActive: darkWebReport({ credentialLeaks, threats, exposures }).active,
    actorsActive: summarizeActors(buildThreatActors(threats)).active,
    familyAtRisk: familyMembers.filter((m) => m.riskLevel !== "low").length,
    travelElevated: travelAlerts.filter((t) => t.riskLevel !== "low").length,
  });
  const coverageSummary = summarizeCoverage(coverage);

  return (
    <div className="space-y-5">
      <PageHeader
        icon={LayoutGrid}
        title="Executive Command"
        subtitle="Heat maps, exposure graphs and the threat timeline — the principal's protection picture at a glance."
      />
      <ExecutiveTabs />

      {/* Protection coverage rollup */}
      <Card className="p-4">
        <SectionTitle
          title="Protection coverage"
          subtitle={`${coverageSummary.secure}/${coverageSummary.pillars} pillars secure · ${coverageSummary.needingAction} need action`}
        />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7">
          {coverage.map((p) => {
            const ok = p.status === "secure";
            return (
              <Link
                key={p.key}
                href={p.href}
                className={cn("group rounded-xl border bg-bg-subtle/40 p-3 transition hover:bg-bg-subtle/70", ok ? "border-border" : "border-risk-high/30")}
              >
                <div className="flex items-center justify-between">
                  {ok
                    ? <ShieldCheck className="h-4 w-4 text-risk-low" />
                    : <AlertTriangle className="h-4 w-4 text-risk-high" />}
                  <ArrowRight className="h-3.5 w-3.5 text-slate-600 transition group-hover:text-brand-fg" />
                </div>
                <p className={cn("mt-1.5 text-lg font-bold", ok ? "text-risk-low" : "text-risk-high")}>{p.count}</p>
                <p className="truncate text-[10px] font-medium uppercase tracking-wide text-slate-400">{p.label}</p>
              </Link>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Heat map */}
        <Card className="p-4">
          <SectionTitle title="Exposure heat map" subtitle="Category × severity" action={<Grid3x3 className="h-4 w-4 text-slate-500" />} />
          {heat.length === 0 ? (
            <p className="text-sm text-slate-500">No exposures to map.</p>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 pl-24">
                {LEVELS.map((l) => (
                  <span key={l} className="w-9 text-center text-[9px] uppercase text-slate-500">{l}</span>
                ))}
              </div>
              {heat.map((row) => (
                <div key={row.category} className="flex items-center gap-2">
                  <span className="w-24 shrink-0 truncate text-xs text-slate-300">{titleCase(row.category)}</span>
                  {LEVELS.map((l) => {
                    const n = row.counts[l];
                    return (
                      <span
                        key={l}
                        className={cn("flex h-9 w-9 items-center justify-center rounded text-[11px] font-bold", n > 0 ? `${CELL[l]} text-black` : "bg-bg-subtle text-slate-600 ring-1 ring-border")}
                        style={n > 0 ? { opacity: Math.min(1, 0.45 + n * 0.18) } : undefined}
                      >
                        {n > 0 ? n : ""}
                      </span>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Exposure graph */}
        <Card className="p-4">
          <SectionTitle title="Exposure graph" subtitle="By category" action={<BarChart3 className="h-4 w-4 text-slate-500" />} />
          {graph.length === 0 ? (
            <p className="text-sm text-slate-500">No exposures to chart.</p>
          ) : (
            <div className="space-y-2">
              {graph.map((g) => (
                <div key={g.category} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 truncate text-xs text-slate-300">{titleCase(g.category)}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-bg-subtle">
                    <div className={cn("h-full rounded-full", BAR[g.highest])} style={{ width: `${(g.count / maxBar) * 100}%` }} />
                  </div>
                  <span className="w-6 text-right text-xs text-slate-300">{g.count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Threat timeline */}
      <Card className="p-4">
        <SectionTitle title="Threat timeline" subtitle="Most recent first" action={<Clock className="h-4 w-4 text-slate-500" />} />
        {timeline.length === 0 ? (
          <p className="text-sm text-slate-500">No threats on the timeline.</p>
        ) : (
          <ol className="relative space-y-3 border-l border-border pl-5">
            {timeline.map((ev, i) => (
              <li key={i} className="relative">
                <span className={cn("absolute -left-[1.45rem] top-1 h-2.5 w-2.5 rounded-full ring-2 ring-bg", CELL[ev.riskLevel])} />
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-white">{ev.title}</p>
                  <RiskBadge level={ev.riskLevel} />
                  {ev.acknowledged && <span className="rounded bg-bg-elevated px-1.5 py-0.5 text-[9px] font-semibold uppercase text-slate-400 ring-1 ring-border">Acknowledged</span>}
                </div>
                <p className="text-[11px] text-slate-500">{titleCase(ev.kind)} · {ev.at ? timeAgo(ev.at) : "—"}</p>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
