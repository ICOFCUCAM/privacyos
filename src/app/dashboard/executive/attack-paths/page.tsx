import Link from "next/link";
import { Target, Crosshair, ShieldCheck, Zap, ArrowRight, SlidersHorizontal } from "lucide-react";
import { Card, PageHeader, SectionTitle } from "@/components/ui";
import { getDataSource } from "@/lib/data";
import { getModuleData } from "@/lib/data/modules";
import { analyzeAttackSurface, simulateRemovals, remediationHref, type AttackPath } from "@/lib/executive/os/attack-paths";
import { cn } from "@/lib/ui";
import { ExecutiveTabs } from "../tabs";

export const metadata = { title: "Executive — Attack Paths" };

function scoreTone(n: number): string {
  return n >= 70 ? "text-risk-critical" : n >= 45 ? "text-risk-high" : n >= 20 ? "text-risk-medium" : "text-risk-low";
}
function scoreBar(n: number): string {
  return n >= 70 ? "bg-risk-critical" : n >= 45 ? "bg-risk-high" : n >= 20 ? "bg-risk-medium" : "bg-risk-low";
}

export default async function AttackPathsPage() {
  const { exposures, threats } = await (await getDataSource()).getDataset();
  const { credentialLeaks } = await getModuleData();
  const surface = analyzeAttackSurface({ exposures, threats, credentialLeaks });
  const leverage = simulateRemovals({ exposures, threats, credentialLeaks }).filter((r) => r.pathsBroken > 0 || r.scoreDrop > 0);

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Target}
        title="Attack Path Analysis"
        subtitle="How an adversary could chain the principal's exposures into real-world harm — and the single highest-leverage fix that collapses the most paths."
        actions={
          <span className={cn("inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ring-1", surface.enabledPaths === 0 ? "bg-risk-low/10 text-risk-low ring-risk-low/30" : "bg-risk-high/10 text-risk-high ring-risk-high/30")}>
            {surface.enabledPaths} live attack path{surface.enabledPaths === 1 ? "" : "s"}
          </span>
        }
      />
      <ExecutiveTabs />

      {/* The sniper shot — highest-leverage single fix */}
      {surface.chokepoint ? (
        <Card className="border-brand/40 bg-gradient-to-br from-brand/10 to-transparent p-5">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand/20 text-brand-fg ring-1 ring-brand/40">
              <Crosshair className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-fg">Highest-leverage fix · the one shot</p>
              <p className="mt-0.5 text-lg font-bold text-white">{surface.chokepoint.action}</p>
              <p className="mt-1 text-sm text-slate-300">
                Eliminating <span className="font-semibold text-white">{surface.chokepoint.label.toLowerCase()}</span>
                {surface.chokepoint.count > 0 && <> ({surface.chokepoint.count} item{surface.chokepoint.count === 1 ? "" : "s"})</>} collapses{" "}
                <span className="font-semibold text-risk-high">{surface.chokepoint.breaks}</span> live attack path{surface.chokepoint.breaks === 1 ? "" : "s"} —
                the biggest risk reduction from a single action.
              </p>
            </div>
            <div className="hidden shrink-0 flex-col items-center justify-center sm:flex">
              <span className="text-2xl font-bold text-risk-high">−{surface.chokepoint.scoreReduction}</span>
              <span className="text-[10px] uppercase text-slate-500">path risk</span>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link href={remediationHref(surface.chokepoint.signal)} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90">
              Apply this fix <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <span className="text-[11px] text-slate-500">In Autopilot we work this for you and log it — you only sign off on critical calls.</span>
          </div>
        </Card>
      ) : (
        <Card className="p-5">
          <div className="flex items-center gap-3 text-sm text-risk-low">
            <ShieldCheck className="h-5 w-5 shrink-0" />
            No live attack paths — the principal's footprint can't be chained into a known attack today.
          </div>
        </Card>
      )}

      {/* Ranked attack paths */}
      <Card className="p-4">
        <SectionTitle title="Attack paths" subtitle="Ranked by feasibility × impact — present links are lit, missing links break the chain" />
        <ul className="space-y-3">
          {surface.paths.map((p) => <PathRow key={p.id} p={p} />)}
        </ul>
      </Card>

      {/* What-if leverage analysis */}
      {leverage.length > 0 && (
        <Card className="p-4">
          <SectionTitle title="Remove-this leverage" subtitle="What collapses if you eliminate each signal — most leverage first" action={<SlidersHorizontal className="h-4 w-4 text-slate-500" />} />
          <ul className="space-y-1.5">
            {leverage.map((r) => (
              <li key={r.signal} className="flex items-center gap-3 rounded-lg border border-border bg-bg-subtle/40 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-slate-200">{r.action}</p>
                  <p className="text-[11px] text-slate-500">{r.label}{r.count > 0 && <> · {r.count} item{r.count === 1 ? "" : "s"}</>} · {r.pathsAfter} path(s) would remain</p>
                </div>
                {r.pathsBroken > 0 && (
                  <span className="shrink-0 rounded-md bg-risk-low/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-risk-low ring-1 ring-risk-low/30">
                    −{r.pathsBroken} path{r.pathsBroken === 1 ? "" : "s"}
                  </span>
                )}
                <span className="shrink-0 text-xs font-semibold text-risk-low">−{r.scoreDrop}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function PathRow({ p }: { p: AttackPath }) {
  return (
    <li className={cn("rounded-xl border bg-bg-subtle/40 p-3.5", p.enabled ? "border-risk-high/30" : "border-border")}>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-white">{p.name}</p>
            {p.enabled && <span className="inline-flex items-center gap-1 rounded bg-risk-high/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-risk-high ring-1 ring-risk-high/30"><Zap className="h-3 w-3" /> Live</span>}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">{p.harm}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className={cn("text-xl font-bold", scoreTone(p.score))}>{p.score}</p>
          <p className="text-[9px] uppercase text-slate-500">risk score</p>
        </div>
      </div>

      {/* Kill-chain: lit links present, dim links missing */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {p.steps.map((s, i) => (
          <span key={s.signal} className="flex items-center gap-1.5">
            <span
              className={cn(
                "rounded-md px-2 py-0.5 text-[10px] font-medium ring-1",
                s.present ? "bg-risk-high/10 text-risk-high ring-risk-high/30" : "bg-bg-elevated text-slate-500 ring-border line-through",
              )}
              title={s.evidence}
            >
              {s.label}
            </span>
            {i < p.steps.length - 1 && <ArrowRight className="h-3 w-3 text-slate-600" />}
          </span>
        ))}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-subtle">
          <div className={cn("h-full rounded-full", scoreBar(p.score))} style={{ width: `${p.feasibility}%` }} />
        </div>
        <span className="shrink-0 text-[10px] text-slate-500">{p.present}/{p.total} links · {p.feasibility}% feasible</span>
      </div>
    </li>
  );
}
