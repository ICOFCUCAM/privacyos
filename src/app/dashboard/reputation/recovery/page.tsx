import Link from "next/link";
import { LifeBuoy, ArrowDownToLine, Wrench, Siren, FolderKanban, ArrowRight } from "lucide-react";
import { Card, PageHeader, RiskBadge, SectionTitle } from "@/components/ui";
import { getDataSource } from "@/lib/data";
import { getModuleData } from "@/lib/data/modules";
import { recoveryProgram, type CrisisTier } from "@/lib/reputation/os/recovery";
import { getRankings } from "@/lib/reputation/os/serp-cache";
import { openReputationRecoveryCases } from "@/lib/reputation/os/reputation-cases";
import { cn, titleCase } from "@/lib/ui";
import { ReputationTabs } from "../tabs";

export const metadata = { title: "Reputation — Recovery" };

const TIER: Record<CrisisTier, { label: string; cls: string; bg: string; ring: string }> = {
  monitor: { label: "Monitor", cls: "text-risk-low", bg: "bg-risk-low/10", ring: "ring-risk-low/30" },
  contain: { label: "Contain", cls: "text-risk-medium", bg: "bg-risk-medium/10", ring: "ring-risk-medium/30" },
  full_response: { label: "Full response", cls: "text-risk-high", bg: "bg-risk-high/10", ring: "ring-risk-high/30" },
};

export default async function RecoveryPage() {
  const { mentions } = await getModuleData();
  const { subject, cases } = await (await getDataSource()).getDataset();
  // Reuse the same cached SERP row the SEO tab populates — no extra credit.
  const { results } = await getRankings(subject.displayName, subject.id);
  const r = recoveryProgram(mentions, results);
  const T = TIER[r.crisis.tier];
  // The autonomous loop opens these from negative/defamatory coverage.
  const activeCases = openReputationRecoveryCases(cases);

  return (
    <div className="space-y-5">
      <PageHeader icon={LifeBuoy} title="Reputation Recovery" subtitle="Negative-content suppression, repair workflows and crisis communications." />
      <ReputationTabs />

      {/* Crisis posture */}
      <Card className={cn("p-4 ring-1", T.bg, T.ring)}>
        <div className="flex items-center gap-3">
          <Siren className={cn("h-5 w-5 shrink-0", T.cls)} />
          <div className="flex-1">
            <p className={cn("text-sm font-semibold", T.cls)}>Crisis posture: {T.label}</p>
            <p className="text-xs text-slate-400">{r.crisis.trigger}</p>
          </div>
        </div>
        <ol className="mt-3 space-y-1.5">
          {r.crisis.steps.map((s) => (
            <li key={s.step} className="flex items-center gap-3 rounded-lg border border-border bg-bg-subtle/40 px-3 py-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bg-elevated text-[11px] font-bold text-slate-400">{s.step}</span>
              <span className="min-w-0 flex-1 text-xs text-slate-300">{s.action}</span>
              <span className="shrink-0 rounded bg-bg-elevated px-1.5 py-0.5 text-[10px] text-slate-400 ring-1 ring-border">{s.owner}</span>
            </li>
          ))}
        </ol>
      </Card>

      {/* Active recovery cases — opened autonomously from coverage */}
      {activeCases.length > 0 && (
        <Card className="p-4">
          <SectionTitle
            title="Active recovery cases"
            subtitle="Opened automatically from negative/defamatory coverage"
            action={<Link href="/dashboard/cases" className="inline-flex items-center gap-1 text-xs font-medium text-brand-fg hover:underline">All cases <ArrowRight className="h-3.5 w-3.5" /></Link>}
          />
          <ul className="space-y-2">
            {activeCases.map((c) => (
              <li key={c.id}>
                <Link href="/dashboard/cases" className="flex items-center gap-3 rounded-xl border border-border bg-bg-subtle/40 p-3 transition hover:border-brand/30 hover:bg-bg-subtle/70">
                  <FolderKanban className="h-4 w-4 shrink-0 text-brand-fg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{c.title}</p>
                    <p className="text-[11px] text-slate-500">{titleCase(c.status)} · {titleCase(c.assignedAgent)} agent</p>
                  </div>
                  <RiskBadge level={c.riskLevel} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Suppression */}
        <Card className="p-4">
          <SectionTitle title="Suppression plan" subtitle="Push negatives off page one" action={<ArrowDownToLine className="h-4 w-4 text-slate-500" />} />
          {r.suppression.length === 0 ? (
            <p className="text-sm text-slate-500">No negative or defamatory assets to suppress — reputation is clean.</p>
          ) : (
            <div className="space-y-2">
              {r.suppression.map((t, i) => (
                <div key={i} className="rounded-xl border border-border bg-bg-subtle/40 p-3">
                  <div className="flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-white">{t.title}</p>
                    {t.liveRank && <span className="shrink-0 rounded bg-risk-low/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-risk-low ring-1 ring-risk-low/30">Live rank</span>}
                    {t.defamatory && <span className="shrink-0 rounded bg-risk-critical/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-risk-critical">Defamatory</span>}
                  </div>
                  <p className="text-[11px] text-slate-500">{t.source} · {t.liveRank ? "live " : ""}rank {t.currentRank ? `#${t.currentRank}` : "—"} → projected #{t.projectedRank}</p>
                  <ul className="mt-1.5 space-y-0.5">
                    {t.tactics.map((tac, j) => (
                      <li key={j} className="text-[11px] text-slate-400">• {tac}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Repair workflow */}
        <Card className="p-4">
          <SectionTitle title="Repair workflow" subtitle="Rebuild a healthy footprint" action={<Wrench className="h-4 w-4 text-slate-500" />} />
          <ol className="space-y-1.5">
            {r.repair.map((s) => (
              <li key={s.step} className="flex items-center gap-3 rounded-lg border border-border bg-bg-subtle/40 px-3 py-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bg-elevated text-[11px] font-bold text-slate-400">{s.step}</span>
                <span className="min-w-0 flex-1 text-xs text-slate-300">{s.action}</span>
                <span className="shrink-0 rounded bg-bg-elevated px-1.5 py-0.5 text-[10px] text-slate-400 ring-1 ring-border">{s.owner}</span>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}
