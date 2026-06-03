import Link from "next/link";
import {
  ShieldCheck, FileLock2, Radar, ShieldAlert, Link2, Fingerprint, Lock,
  FolderKanban, ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, PageHeader, SectionTitle, RiskBadge } from "@/components/ui";
import { getDataSource } from "@/lib/data";
import {
  buildEvidence, evidenceStats, filterEvidence, shortHash,
  type EvidenceFilter, type EvidenceItem, type EvidenceKind,
} from "@/lib/intelligence/evidence-vault";
import { cn, timeAgo, titleCase } from "@/lib/ui";

export const metadata = { title: "Evidence Vault" };

const KIND_META: Record<EvidenceKind, { label: string; icon: LucideIcon }> = {
  exposure_record: { label: "Exposure record", icon: Radar },
  threat_detection: { label: "Threat detection", icon: ShieldAlert },
  case_artifact: { label: "Case artifact", icon: FolderKanban },
};

const FILTERS: { key: EvidenceFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "exposure_record", label: "Exposures" },
  { key: "threat_detection", label: "Threats" },
  { key: "linked", label: "Case-linked" },
  { key: "critical", label: "Critical" },
  { key: "high", label: "High" },
];

export default async function EvidencePage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const ds = await getDataSource();
  const [data, persisted, params] = await Promise.all([
    ds.getDataset(),
    ds.listEvidence().catch(() => []),
    searchParams,
  ]);
  // Sealed ledger first (the autonomous actions the engine actually performed),
  // then the derived exposure/threat records — one newest-first catalog.
  const all = [...persisted, ...buildEvidence(data.exposures, data.threats, data.cases)]
    .sort((a, b) => b.collectedAt.localeCompare(a.collectedAt));
  const stats = evidenceStats(all);
  const filter = (params.filter ?? "all") as EvidenceFilter;
  const items = filterEvidence(all, filter);

  return (
    <div className="space-y-5">
      <PageHeader
        icon={FileLock2}
        title="Evidence Vault"
        subtitle="A tamper-evident, cross-case evidence repository — every finding sealed with a SHA-256 digest and a full chain of custody, ready for legal, regulator or insurer."
      />

      {/* Integrity banner */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-risk-low/30 bg-risk-low/10 px-4 py-3">
        <ShieldCheck className="h-5 w-5 shrink-0 text-risk-low" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-risk-low">Integrity verified · {stats.sealed}/{stats.total} items sealed</p>
          <p className="mt-0.5 text-xs text-slate-400">Every item carries a SHA-256 content seal and an immutable custody log. Any later change to the underlying record breaks the seal.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Evidence items" value={String(stats.total)} icon={Fingerprint} tone="text-white" />
        <Kpi label="Case-linked" value={String(stats.linkedToCases)} icon={Link2} tone="text-white" />
        <Kpi label="Sources" value={String(stats.sources)} icon={Radar} tone="text-white" />
        <Kpi label="Sealed (SHA-256)" value={String(stats.sealed)} icon={Lock} tone="text-risk-low" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-1.5">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <Link
              key={f.key}
              href={f.key === "all" ? "/dashboard/evidence" : `/dashboard/evidence?filter=${f.key}`}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium ring-1 transition",
                active ? "bg-brand/15 text-white ring-brand/30" : "bg-bg-elevated text-slate-400 ring-border hover:text-white",
              )}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {/* Catalog */}
      <Card className="p-4">
        <SectionTitle
          title="Evidence catalog"
          subtitle="Each row is a sealed artifact — expand for the chain of custody"
          action={<span className="text-xs text-slate-500">{items.length} item{items.length === 1 ? "" : "s"}</span>}
        />
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">No evidence matches this filter.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((e) => <EvidenceRow key={e.id} e={e} />)}
          </ul>
        )}
      </Card>
    </div>
  );
}

function EvidenceRow({ e }: { e: EvidenceItem }) {
  const M = KIND_META[e.kind];
  const Icon = M.icon;
  return (
    <li className="rounded-xl border border-border bg-bg-subtle/40">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-3 p-3.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg-elevated text-brand-fg ring-1 ring-border">
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium text-white">{e.title}</p>
              <RiskBadge level={e.riskLevel} />
            </div>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-slate-500">
              <span>{M.label}</span>
              <span>·</span>
              <span>{e.source}</span>
              <span>·</span>
              <span>collected {timeAgo(e.collectedAt)}</span>
              {e.caseTitle && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 text-brand-fg"><Link2 className="h-3 w-3" />{e.caseTitle}</span>
                </>
              )}
            </p>
          </div>
          <code className="hidden shrink-0 rounded bg-bg-elevated px-1.5 py-0.5 text-[10px] text-slate-400 ring-1 ring-border sm:inline">
            {shortHash(e.hash)}
          </code>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-600 transition group-open:rotate-90" />
        </summary>

        <div className="space-y-3 border-t border-border px-3.5 py-3">
          {/* Seal */}
          <div className="flex items-start gap-2">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-risk-low" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">SHA-256 integrity seal</p>
              <code className="block break-all text-[11px] text-slate-300">{e.hash}</code>
            </div>
          </div>

          {/* Chain of custody */}
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Chain of custody</p>
            <ol className="space-y-1.5">
              {e.custody.map((c, i) => (
                <li key={i} className="flex items-center gap-2.5 text-xs">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-bg-elevated text-[10px] font-bold text-slate-400">{i + 1}</span>
                  <span className="rounded bg-brand/12 px-1.5 py-0.5 text-[10px] font-medium text-brand-fg ring-1 ring-brand/20">{titleCase(c.actor)}</span>
                  <span className="flex-1 text-slate-300">{c.action}</span>
                  <span className="shrink-0 text-[10px] text-slate-500">{timeAgo(c.at)}</span>
                </li>
              ))}
            </ol>
          </div>

          {e.caseId && (
            <Link href="/dashboard/cases" className="inline-flex items-center gap-1 text-xs font-medium text-brand-fg hover:underline">
              <FolderKanban className="h-3.5 w-3.5" /> View linked case
            </Link>
          )}
        </div>
      </details>
    </li>
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
