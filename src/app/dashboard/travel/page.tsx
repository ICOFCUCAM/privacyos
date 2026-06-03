import Link from "next/link";
import {
  Plane, MapPin, ShieldCheck, CalendarClock, AlertTriangle, ListChecks,
  ArrowRight, Route,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, PageHeader, RiskBadge, SectionTitle } from "@/components/ui";
import { getModuleData } from "@/lib/data/modules";
import { getDataSource } from "@/lib/data";
import {
  assessTrips, summarizeTravel,
  type TravelAssessment, type TravelMeasure, type TravelPosture,
} from "@/lib/intelligence/travel-risk";
import {
  tripRegistry, destinationIntel, travelReadiness, type DestinationIntel,
} from "@/lib/travel/os/travel-os";
import { executiveRiskIndices } from "@/lib/executive/os/risk-indices";
import { ExecutiveTabs } from "../executive/tabs";
import { cn } from "@/lib/ui";

export const metadata = { title: "Travel Risk" };

const POSTURE: Record<TravelPosture, { label: string; cls: string; bg: string; ring: string }> = {
  low: { label: "Low", cls: "text-risk-low", bg: "bg-risk-low/10", ring: "ring-risk-low/30" },
  guarded: { label: "Guarded", cls: "text-risk-medium", bg: "bg-risk-medium/10", ring: "ring-risk-medium/30" },
  elevated: { label: "Elevated", cls: "text-risk-high", bg: "bg-risk-high/10", ring: "ring-risk-high/30" },
  high: { label: "High", cls: "text-risk-critical", bg: "bg-risk-critical/10", ring: "ring-risk-critical/30" },
};

const PRIORITY: Record<TravelMeasure["priority"], string> = {
  critical: "text-risk-critical bg-risk-critical/10 ring-risk-critical/30",
  high: "text-risk-high bg-risk-high/10 ring-risk-high/30",
  standard: "text-slate-400 bg-bg-elevated ring-border",
};

export default async function TravelPage() {
  const [{ travelAlerts }, data] = await Promise.all([
    getModuleData(),
    (await getDataSource()).getDataset(),
  ]);
  const trips = assessTrips(travelAlerts, data.exposures, data.threats);
  const summary = summarizeTravel(trips);
  const registry = tripRegistry(trips);
  const destinations = destinationIntel(trips);
  const readiness = travelReadiness(trips);
  const SP = POSTURE[summary.highestPosture];
  const travelIndex = executiveRiskIndices({ exposures: [], threats: [], family: [], travel: travelAlerts }).travel;

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Plane}
        title="Travel Risk"
        subtitle="Pre-travel risk assessments that correlate each itinerary with the principal's live exposure and threat intelligence — with protective measures per trip."
        actions={
          <div className="flex items-center gap-2">
            <span className={cn("inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ring-1", travelIndex >= 50 ? "bg-risk-high/10 text-risk-high ring-risk-high/30" : travelIndex >= 25 ? "bg-risk-medium/10 text-risk-medium ring-risk-medium/30" : "bg-risk-low/10 text-risk-low ring-risk-low/30")}>
              Travel Security Index {travelIndex}
            </span>
            <span className={cn("inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ring-1", SP.bg, SP.cls, SP.ring)}>
              Highest posture: {SP.label}
            </span>
          </div>
        }
      />

      <ExecutiveTabs />

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Upcoming trips" value={String(summary.upcoming)} icon={CalendarClock} tone="text-white" />
        <Kpi label="Elevated / high" value={String(summary.elevated)} icon={AlertTriangle} tone={summary.elevated > 0 ? "text-risk-high" : "text-risk-low"} />
        <Kpi label="Destinations" value={String(summary.destinations)} icon={MapPin} tone="text-white" />
        <Kpi
          label="Next departure"
          value={summary.next?.daysUntil != null ? `${summary.next.daysUntil}d` : "—"}
          icon={Plane}
          tone="text-white"
          sub={summary.next?.alert.destination}
        />
      </div>

      {trips.length === 0 ? (
        <Card className="p-4">
          <p className="text-sm text-slate-500">No trips on the itinerary. Add travel to receive pre-travel risk assessments.</p>
        </Card>
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
            {/* Pre-travel readiness */}
            <Card className="p-4">
              <SectionTitle title="Pre-travel readiness" subtitle="Protective measures outstanding on upcoming travel" />
              <div className="flex items-center gap-4">
                <div className={cn("flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full ring-4", readiness.readiness >= 75 ? "ring-risk-low/30" : readiness.readiness >= 45 ? "ring-risk-medium/30" : "ring-risk-high/30")}>
                  <span className={cn("text-2xl font-bold", readiness.readiness >= 75 ? "text-risk-low" : readiness.readiness >= 45 ? "text-risk-medium" : "text-risk-high")}>{readiness.readiness}</span>
                  <span className="text-[9px] uppercase text-slate-500">ready</span>
                </div>
                <div className="min-w-0 flex-1 space-y-1 text-xs text-slate-400">
                  <p>{readiness.upcomingTrips} upcoming/active trip(s)</p>
                  <p>{readiness.measures} protective measure(s) — <span className="text-risk-high">{readiness.criticalMeasures} critical</span>, <span className="text-risk-medium">{readiness.highMeasures} high</span></p>
                  {readiness.readiness < 100 && <p className="text-slate-500">Clear critical/high measures before departure to raise readiness.</p>}
                </div>
              </div>
            </Card>

            {/* Destination intelligence */}
            <Card className="p-4">
              <SectionTitle title="Destination intelligence" subtitle="Per-destination risk, worst first" action={<MapPin className="h-4 w-4 text-slate-500" />} />
              <ul className="space-y-2">
                {destinations.map((d) => <DestinationRow key={d.destination} d={d} />)}
              </ul>
            </Card>
          </div>

          {/* Trip registry (phased) */}
          {registry.map((g) => (
            <div key={g.phase} className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-white">{g.label}</h2>
                <span className="text-xs text-slate-500">{g.trips.length}</span>
              </div>
              {g.trips.map((t) => <TripCard key={t.alert.id} t={t} />)}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function DestinationRow({ d }: { d: DestinationIntel }) {
  const P = POSTURE[d.posture];
  return (
    <li className="flex items-center gap-3 rounded-lg border border-border bg-bg-subtle/40 px-3 py-2">
      <MapPin className="h-4 w-4 shrink-0 text-brand-fg" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{d.destination}</p>
        <p className="truncate text-[11px] text-slate-500">{d.advisory}</p>
      </div>
      <div className="shrink-0 text-right">
        <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1", P.bg, P.cls, P.ring)}>{P.label}</span>
        <p className="mt-0.5 text-[10px] text-slate-500">{d.trips} trip(s){d.nextDays != null && ` · in ${d.nextDays}d`}</p>
      </div>
    </li>
  );
}

function TripCard({ t }: { t: TravelAssessment }) {
  const P = POSTURE[t.posture];
  return (
    <Card className={cn("p-4 ring-1", P.ring)}>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-bg-elevated text-brand-fg ring-1 ring-border">
            <Route className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-white">{t.alert.destination}</p>
            <p className="text-[11px] text-slate-500">
              {t.alert.travelDate ?? "Date TBD"}
              {t.daysUntil != null && (
                <span className="text-slate-400"> · {t.upcoming ? `in ${t.daysUntil} day${t.daysUntil === 1 ? "" : "s"}` : "completed"}</span>
              )}
            </p>
          </div>
        </div>
        <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold ring-1", P.bg, P.cls, P.ring)}>
          {P.label} · {t.riskScore}
        </span>
      </div>

      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        {/* Risk factors */}
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Risk factors</p>
          <ul className="space-y-1.5">
            {t.factors.map((f, i) => (
              <li key={i} className="flex items-start gap-2 rounded-lg border border-border bg-bg-subtle/40 px-2.5 py-1.5">
                <RiskBadge level={f.severity} />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-white">{f.label}</p>
                  <p className="text-[11px] text-slate-500">{f.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Protective measures */}
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            <ListChecks className="h-3.5 w-3.5" /> Protective measures
          </p>
          <ul className="space-y-1.5">
            {t.measures.map((m, i) => (
              <li key={i} className="flex items-center gap-2.5 rounded-lg border border-border bg-bg-subtle/40 px-2.5 py-1.5">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-brand-fg" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-white">{m.task}</p>
                  <p className="text-[11px] text-slate-500">{m.rationale}</p>
                </div>
                <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ring-1", PRIORITY[m.priority])}>
                  {m.priority}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-3 border-t border-border pt-2.5">
        <Link href="/dashboard/executive" className="inline-flex items-center gap-1 text-xs font-medium text-brand-fg hover:underline">
          Executive protection posture <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </Card>
  );
}

function Kpi({ label, value, icon: Icon, tone, sub }: { label: string; value: string; icon: LucideIcon; tone?: string; sub?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</span>
        <Icon className="h-3.5 w-3.5 text-slate-500" />
      </div>
      <p className={cn("mt-1 text-2xl font-bold", tone)}>{value}</p>
      {sub && <p className="mt-0.5 truncate text-[11px] text-slate-500">{sub}</p>}
    </Card>
  );
}
