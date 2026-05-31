import { Rocket, TrendingUp, Newspaper, LifeBuoy } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, PageHeader, SectionTitle } from "@/components/ui";
import { getDataSource } from "@/lib/data";
import { getModuleData } from "@/lib/data/modules";
import { generateAllCampaigns, type Campaign, type CampaignKind } from "@/lib/reputation/os/campaigns";
import { ReputationTabs } from "../tabs";

export const metadata = { title: "Reputation — Campaigns" };

const KIND: Record<CampaignKind, { icon: LucideIcon; cls: string }> = {
  growth: { icon: TrendingUp, cls: "text-risk-low" },
  pr: { icon: Newspaper, cls: "text-brand-fg" },
  recovery: { icon: LifeBuoy, cls: "text-risk-medium" },
};

export default async function CampaignsPage() {
  const { subject } = await (await getDataSource()).getDataset();
  const { mentions } = await getModuleData();
  const campaigns = generateAllCampaigns(subject, mentions);

  return (
    <div className="space-y-5">
      <PageHeader icon={Rocket} title="Automated Campaigns" subtitle="Auto-generated growth campaigns, PR plans and recovery plans — composed by the Reputation Agent, ready to run." />
      <ReputationTabs />

      <div className="grid gap-5 lg:grid-cols-3">
        {campaigns.map((c) => <CampaignCard key={c.kind} c={c} />)}
      </div>
    </div>
  );
}

function CampaignCard({ c }: { c: Campaign }) {
  const K = KIND[c.kind];
  const Icon = K.icon;
  return (
    <Card className="flex flex-col p-4">
      <div className="flex items-center gap-2">
        <Icon className={`h-4.5 w-4.5 ${K.cls}`} />
        <span className="text-sm font-semibold text-white">{c.name}</span>
      </div>
      <p className="mt-1 text-xs text-slate-400">{c.goal}</p>
      <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500">
        <span>{c.durationWeeks} weeks</span>
        <span className="text-risk-low">+{Math.round(c.projectedLift)} health</span>
      </div>
      <ol className="mt-3 flex-1 space-y-1.5">
        {c.steps.map((s, i) => (
          <li key={i} className="rounded-lg border border-border bg-bg-subtle/40 px-2.5 py-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{s.phase} · {s.channel}</p>
            <p className="text-xs text-slate-300">{s.action}</p>
          </li>
        ))}
      </ol>
    </Card>
  );
}
