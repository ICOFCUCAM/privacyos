import { Search, ArrowUp, ArrowDown, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, PageHeader, SectionTitle } from "@/components/ui";
import { getDataSource } from "@/lib/data";
import { getModuleData } from "@/lib/data/modules";
import { seoProfile, type RankTrend, type ResultSentiment } from "@/lib/reputation/os/seo";
import { cn } from "@/lib/ui";
import { ReputationTabs } from "../tabs";

export const metadata = { title: "Reputation — SEO" };

const TREND_ICON: Record<RankTrend, LucideIcon> = { up: ArrowUp, down: ArrowDown, flat: Minus };
const TREND_CLS: Record<RankTrend, string> = { up: "text-risk-low", down: "text-risk-high", flat: "text-slate-500" };

const SLOT_CLS: Record<ResultSentiment, string> = {
  owned: "bg-brand/15 text-brand-fg ring-brand/30",
  positive: "bg-risk-low/10 text-risk-low ring-risk-low/30",
  neutral: "bg-bg-subtle text-slate-400 ring-border",
  negative: "bg-risk-high/10 text-risk-high ring-risk-high/30",
};

export default async function SeoPage() {
  const { subject } = await (await getDataSource()).getDataset();
  const { mentions } = await getModuleData();
  const seo = seoProfile(subject, mentions);

  return (
    <div className="space-y-5">
      <PageHeader icon={Search} title="Search & SEO" subtitle="Keyword ranking, page-one dominance and competitive visibility for the principal's name." />
      <ReputationTabs />

      <div className="grid grid-cols-3 gap-3">
        <Stat label="SEO health" value={`${seo.health}`} tone={seo.health >= 70 ? "text-risk-low" : seo.health >= 45 ? "text-risk-medium" : "text-risk-high"} />
        <Stat label="Page-one dominance" value={`${seo.pageOne.dominance}%`} tone="text-white" />
        <Stat label="Negative results" value={`${seo.pageOne.negative}`} tone={seo.pageOne.negative > 0 ? "text-risk-high" : "text-risk-low"} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Page one */}
        <Card className="p-4">
          <SectionTitle title="Page-one dominance" subtitle="Top 10 search results for the principal's name" />
          <ol className="space-y-1.5">
            {seo.pageOne.slots.map((slot) => (
              <li key={slot.position} className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-bg-elevated text-[11px] font-bold text-slate-400">{slot.position}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-slate-300">{slot.title}</span>
                <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ring-1", SLOT_CLS[slot.sentiment])}>{slot.sentiment}</span>
              </li>
            ))}
          </ol>
        </Card>

        <div className="space-y-5">
          {/* Keywords */}
          <Card className="p-4">
            <SectionTitle title="Keyword tracking" subtitle="Rank vs target" />
            <ul className="space-y-1.5">
              {seo.keywords.map((k, i) => {
                const Icon = TREND_ICON[k.trend];
                return (
                  <li key={i} className="flex items-center gap-3 rounded-lg border border-border bg-bg-subtle/40 px-3 py-2">
                    <Icon className={cn("h-3.5 w-3.5 shrink-0", TREND_CLS[k.trend])} />
                    <span className="min-w-0 flex-1 truncate text-xs text-slate-300">{k.keyword}</span>
                    <span className="shrink-0 text-xs text-slate-500">#{k.rank} <span className="text-slate-600">→ #{k.target}</span></span>
                  </li>
                );
              })}
            </ul>
          </Card>

          {/* Competitive */}
          <Card className="p-4">
            <SectionTitle title="Competitive visibility" subtitle="Share of voice" />
            <div className="space-y-2">
              {seo.competitive.map((c, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className={cn("w-28 shrink-0 truncate text-xs", c.you ? "font-semibold text-white" : "text-slate-400")}>{c.name}{c.you && " (you)"}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg-subtle">
                    <div className={cn("h-full rounded-full", c.you ? "bg-brand" : "bg-slate-600")} style={{ width: `${c.shareOfVoice}%` }} />
                  </div>
                  <span className="w-9 text-right text-xs text-slate-300">{c.shareOfVoice}%</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Card className="p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold", tone)}>{value}</p>
    </Card>
  );
}
