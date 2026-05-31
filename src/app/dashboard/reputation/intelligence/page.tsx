import { Sparkles, Users, Handshake, Mic, Headphones } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, PageHeader, SectionTitle } from "@/components/ui";
import { getDataSource } from "@/lib/data";
import { discoverOpportunities, summarizeOpportunities, opportunityLabel, type OpportunityType } from "@/lib/reputation/os/intelligence";
import { cn } from "@/lib/ui";
import { ReputationTabs } from "../tabs";

export const metadata = { title: "Reputation — Intelligence" };

const TYPE_ICON: Record<OpportunityType, LucideIcon> = {
  influencer: Users, partnership: Handshake, speaking: Mic, podcast: Headphones,
};

export default async function IntelligencePage() {
  const { subject } = await (await getDataSource()).getDataset();
  const opportunities = discoverOpportunities(subject);
  const summary = summarizeOpportunities(opportunities);

  return (
    <div className="space-y-5">
      <PageHeader icon={Sparkles} title="Opportunity Intelligence" subtitle="Influencer, partnership, speaking and podcast opportunities — discovered and ranked by fit." />
      <ReputationTabs />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(Object.keys(summary.byType) as OpportunityType[]).map((t) => {
          const Icon = TYPE_ICON[t];
          return (
            <Card key={t} className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{opportunityLabel(t)}</span>
                <Icon className="h-3.5 w-3.5 text-slate-500" />
              </div>
              <p className="mt-1 text-2xl font-bold text-white">{summary.byType[t]}</p>
            </Card>
          );
        })}
      </div>

      <Card className="p-4">
        <SectionTitle title="Discovered opportunities" subtitle={`${summary.total} opportunities · top fit ${summary.topFit}%`} />
        <div className="space-y-2">
          {opportunities.map((o, i) => {
            const Icon = TYPE_ICON[o.type];
            return (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-bg-subtle/40 p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-bg-elevated text-brand-fg ring-1 ring-border">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-white">{o.name}</p>
                    <span className="shrink-0 rounded bg-bg-elevated px-1.5 py-0.5 text-[9px] font-semibold uppercase text-slate-400 ring-1 ring-border">{opportunityLabel(o.type)}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">{o.detail} · {o.audience}</p>
                </div>
                <span className={cn("shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1", o.fit >= 80 ? "bg-risk-low/10 text-risk-low ring-risk-low/30" : "bg-brand/12 text-brand-fg ring-brand/25")}>{o.fit}% fit</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
