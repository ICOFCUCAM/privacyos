import Link from "next/link";
import { VenetianMask, UserX, Clapperboard, Globe, Sparkles, FolderKanban, ArrowRight, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, PageHeader, RiskBadge, SectionTitle } from "@/components/ui";
import { getDataSource } from "@/lib/data";
import { getModuleData } from "@/lib/data/modules";
import {
  impersonationReport, impersonationRecommendations, openImpersonationCases,
  IMPERSONATION_LABEL, type ImpersonationCategory,
} from "@/lib/executive/os/impersonation";
import { cn, timeAgo, titleCase } from "@/lib/ui";
import { ExecutiveTabs } from "../tabs";

export const metadata = { title: "Executive — Impersonation" };

const CATEGORY_ICON: Record<ImpersonationCategory, LucideIcon> = {
  fake_profile: UserX, deepfake: Clapperboard, lookalike_domain: Globe, synthetic_media: Sparkles,
};

export default async function ImpersonationPage() {
  const { threats, exposures, cases } = await (await getDataSource()).getDataset();
  const { incidents, domainRisks } = await getModuleData();
  const r = impersonationReport({ threats, incidents, domainRisks, exposures });
  const recommendations = impersonationRecommendations(r);
  const takedownCases = openImpersonationCases(cases);

  return (
    <div className="space-y-5">
      <PageHeader
        icon={VenetianMask}
        title="Impersonation & Deepfake"
        subtitle="Fake profiles, deepfakes, synthetic media and lookalike/phishing domains impersonating the principal — monitored and routed for takedown."
        actions={
          <span className={cn("inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ring-1", r.active === 0 ? "bg-risk-low/10 text-risk-low ring-risk-low/30" : "bg-risk-high/10 text-risk-high ring-risk-high/30")}>
            {r.active} active
          </span>
        }
      />
      <ExecutiveTabs />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(Object.keys(r.byCategory) as ImpersonationCategory[]).map((c) => {
          const Icon = CATEGORY_ICON[c];
          const n = r.byCategory[c];
          return (
            <Card key={c} className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{IMPERSONATION_LABEL[c]}</span>
                <Icon className="h-3.5 w-3.5 text-slate-500" />
              </div>
              <p className={cn("mt-1 text-2xl font-bold", n > 0 ? "text-risk-high" : "text-risk-low")}>{n}</p>
            </Card>
          );
        })}
      </div>

      {takedownCases.length > 0 && (
        <Card className="p-4">
          <SectionTitle
            title="Active takedown cases"
            subtitle="Impersonation / deepfake cases in flight"
            action={<Link href="/dashboard/cases" className="inline-flex items-center gap-1 text-xs font-medium text-brand-fg hover:underline">All cases <ArrowRight className="h-3.5 w-3.5" /></Link>}
          />
          <ul className="space-y-2">
            {takedownCases.map((c) => (
              <li key={c.id}>
                <Link href="/dashboard/cases" className="flex items-center gap-3 rounded-xl border border-border bg-bg-subtle/40 p-3 transition hover:border-brand/30 hover:bg-bg-subtle/70">
                  <FolderKanban className="h-4 w-4 shrink-0 text-brand-fg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{c.title}</p>
                    <p className="text-[11px] text-slate-500">{titleCase(c.type)} · {titleCase(c.status)}</p>
                  </div>
                  <RiskBadge level={c.riskLevel} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-4">
          <SectionTitle title="Detected signals" subtitle="Active first, highest-risk first" action={<span className="text-xs text-slate-500">{r.total} total</span>} />
          {r.signals.length === 0 ? (
            <p className="text-sm text-slate-500">No impersonation or synthetic-media signals against the principal.</p>
          ) : (
            <ul className="space-y-2">
              {r.signals.map((s, i) => {
                const Icon = CATEGORY_ICON[s.category];
                return (
                  <li key={i} className={cn("flex items-center gap-3 rounded-lg border border-border bg-bg-subtle/40 px-3 py-2", s.resolved && "opacity-55")}>
                    <Icon className="h-4 w-4 shrink-0 text-brand-fg" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{s.title}</p>
                      <p className="text-[11px] text-slate-500">
                        {IMPERSONATION_LABEL[s.category]} · {titleCase(s.source)}{s.detectedAt && <> · {timeAgo(s.detectedAt)}</>}{s.resolved && " · resolved"}
                      </p>
                    </div>
                    <RiskBadge level={s.riskLevel} />
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="p-4">
          <SectionTitle title="Takedown plan" subtitle="Per-category remediation" />
          {recommendations.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-risk-low/30 bg-risk-low/10 px-3.5 py-3 text-sm text-risk-low">
              <ShieldCheck className="h-4 w-4 shrink-0" /> No active impersonation — nothing to take down.
            </div>
          ) : (
            <ul className="space-y-2">
              {recommendations.map((rec) => {
                const Icon = CATEGORY_ICON[rec.category];
                return (
                  <li key={rec.category} className="flex items-center gap-3 rounded-xl border border-border bg-bg-subtle/40 p-3">
                    <Icon className="h-4 w-4 shrink-0 text-brand-fg" />
                    <p className="min-w-0 flex-1 text-sm text-slate-200">{rec.action}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
