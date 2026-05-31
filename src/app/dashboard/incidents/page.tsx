import Link from "next/link";
import { Card, DataBadge, RiskBadge, Pill, SectionTitle, StatCard } from "@/components/ui";
import { SeverityBar } from "@/components/viz";
import { getModuleData } from "@/lib/data/modules";
import { cn, timeAgo, titleCase } from "@/lib/ui";
import type { RiskLevel } from "@/lib/types";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "deepfake", label: "Deepfake" },
  { key: "impersonation", label: "Impersonation" },
  { key: "doxxing", label: "Doxxing" },
  { key: "location_exposure", label: "Location" },
];

export default async function IncidentsPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const { kind = "all" } = await searchParams;
  const moduleData = await getModuleData();
  const { incidents } = moduleData;
  const filtered = kind === "all" ? incidents : incidents.filter((i) => i.kind === kind);
  const open = incidents.filter((i) => i.status !== "resolved" && i.status !== "dismissed");
  const levels: RiskLevel[] = ["low", "medium", "high", "critical"];
  const counts: Partial<Record<RiskLevel, number>> = Object.fromEntries(
    levels.map((l) => [l, incidents.filter((i) => i.riskLevel === l).length]),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Incidents</h1>
          <p className="mt-1 text-sm text-slate-400">
            Deepfake, impersonation, doxxing and location-exposure incidents with evidence and takedown workflow.
          </p>
        </div>
        <DataBadge live={moduleData.live} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Open incidents" value={open.length} accent="text-risk-high" />
        <StatCard label="Deepfake" value={incidents.filter((i) => i.kind === "deepfake").length} accent="text-risk-critical" />
        <StatCard label="Impersonation" value={incidents.filter((i) => i.kind === "impersonation").length} />
        <StatCard label="Doxxing" value={incidents.filter((i) => i.kind === "doxxing").length} accent="text-risk-high" />
      </div>

      <Card>
        <SectionTitle title="Severity distribution" subtitle={`${open.length} open · ${incidents.length} total`} />
        <SeverityBar counts={counts} />
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
          {([...levels].reverse()).map((l) => (
            <span key={l} className="flex items-center gap-1.5">
              <RiskBadge level={l} /> {counts[l] ?? 0}
            </span>
          ))}
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/dashboard/incidents" : `/dashboard/incidents?kind=${f.key}`}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition",
              kind === f.key
                ? "bg-brand/15 text-white ring-1 ring-brand/30"
                : "border border-border text-slate-400 hover:bg-bg-elevated hover:text-white",
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((i) => (
          <Card key={i.id} className="flex items-start gap-4">
            <RiskBadge level={i.riskLevel} />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-white">{i.title}</p>
              <p className="mt-0.5 text-sm text-slate-400">{i.detail}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Pill>{titleCase(i.kind)}</Pill>
                <Pill>{titleCase(i.status)}</Pill>
                <Pill>{i.evidenceCount} evidence items</Pill>
                <span className="text-xs text-slate-500">{timeAgo(i.detectedAt)}</span>
              </div>
            </div>
            <button className="shrink-0 self-center rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-bg-elevated">
              Open case
            </button>
          </Card>
        ))}
        {filtered.length === 0 && <p className="text-sm text-slate-500">No incidents match this filter.</p>}
      </div>
    </div>
  );
}
