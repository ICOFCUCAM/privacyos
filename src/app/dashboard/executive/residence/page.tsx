import { Home, MapPin, FileText, Satellite, Building2, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, PageHeader, RiskBadge, SectionTitle } from "@/components/ui";
import { getDataSource } from "@/lib/data";
import { residenceReport, type ResidenceCheck, type ResidenceStatus } from "@/lib/executive/os/residence";
import { getResidenceSignals } from "@/lib/executive/os/residence-cache";
import { cn, timeAgo } from "@/lib/ui";
import { ExecutiveTabs } from "../tabs";

export const metadata = { title: "Executive — Residence" };

const CHECK_ICON: Record<ResidenceCheck, LucideIcon> = {
  address_exposure: MapPin, property_records: FileText, satellite_view: Satellite, home_listing: Building2,
};

const STATUS: Record<ResidenceStatus, { label: string; cls: string; ring: string }> = {
  clear: { label: "Clear", cls: "text-risk-low", ring: "ring-risk-low/30" },
  monitoring: { label: "Monitoring", cls: "text-risk-medium", ring: "ring-risk-medium/30" },
  exposed: { label: "Exposed", cls: "text-risk-high", ring: "ring-risk-high/30" },
};

export default async function ResidencePage() {
  const { exposures } = await (await getDataSource()).getDataset();
  // Look up real property data for the most-significant exposed address; with no
  // PROPERTY_DATA_API_KEY (or no session) this is a no-op and the report infers.
  const topAddress = exposures.filter((e) => e.category === "address").sort((a, b) => b.riskScore - a.riskScore)[0];
  const { signals } = await getResidenceSignals(topAddress?.snippet ?? "");
  const r = residenceReport(exposures, signals);

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Home}
        title="Residence Protection"
        subtitle="Address exposure, property records, satellite/street-view visibility and real-estate listings for the principal's home."
        actions={
          <div className="flex items-center gap-2">
            <span className={cn("inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ring-1", r.protection >= 75 ? "bg-risk-low/10 text-risk-low ring-risk-low/30" : r.protection >= 45 ? "bg-risk-medium/10 text-risk-medium ring-risk-medium/30" : "bg-risk-high/10 text-risk-high ring-risk-high/30")}>
              <ShieldCheck className="h-3.5 w-3.5" /> {r.protection}/100 protected
            </span>
            <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1", r.live ? "bg-risk-low/10 text-risk-low ring-risk-low/30" : "bg-bg-elevated text-slate-400 ring-border")} title={r.live ? "Sourced from live property data" : "Inferred from address exposures — add PROPERTY_DATA_API_KEY for live records"}>
              <span className={cn("h-1.5 w-1.5 rounded-full", r.live ? "bg-risk-low" : "bg-slate-500")} />
              {r.live ? "Property data" : "Inferred"}
            </span>
          </div>
        }
      />
      <ExecutiveTabs />

      <div className="grid gap-3 sm:grid-cols-2">
        {r.findings.map((f) => {
          const Icon = CHECK_ICON[f.check];
          const S = STATUS[f.status];
          return (
            <Card key={f.check} className={cn("p-4 ring-1", S.ring)}>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Icon className="h-4 w-4 text-brand-fg" /> {f.label}
                </span>
                <span className={cn("text-[11px] font-semibold uppercase", S.cls)}>{S.label}</span>
              </div>
              <p className="mt-1.5 text-xs text-slate-400">{f.detail}</p>
              {f.sources.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {f.sources.map((s) => (
                    <span key={s} className="rounded bg-bg-elevated px-1.5 py-0.5 text-[10px] text-slate-400 ring-1 ring-border">{s}</span>
                  ))}
                </div>
              )}
              {f.status !== "clear" && <p className="mt-2 border-t border-border pt-2 text-[11px] text-slate-500">{f.action}</p>}
            </Card>
          );
        })}
      </div>

      {r.addressExposures.length > 0 && (
        <Card className="p-4">
          <SectionTitle title="Address exposures" subtitle="Where the home address was found" />
          <ul className="space-y-2">
            {r.addressExposures.map((e) => (
              <li key={e.id} className="flex items-center gap-3 rounded-lg border border-border bg-bg-subtle/40 px-3 py-2">
                <MapPin className="h-4 w-4 shrink-0 text-risk-high" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{e.sourceName}</p>
                  <p className="truncate text-[11px] text-slate-500">{e.snippet} · found {timeAgo(e.discoveredAt)}</p>
                </div>
                <RiskBadge level={e.riskLevel} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
