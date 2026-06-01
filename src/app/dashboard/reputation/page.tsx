import { Card, DataBadge, PageHeader, Pill, SectionTitle, SentimentBars, LineChart } from "@/components/ui";
import { ReputationScanButton } from "@/components/reputation-scan-button";
import { getDataSource } from "@/lib/data";
import { getModuleData } from "@/lib/data/modules";
import { getScoreHistory } from "@/lib/data/scores";
import { reputationOverview, monitoringCoverage } from "@/lib/reputation/os/analysis";
import { cn, timeAgo, titleCase } from "@/lib/ui";
import type { SentimentLabel } from "@/lib/suite-types";
import { CheckCircle2 } from "lucide-react";
import { ReputationTabs } from "./tabs";

const sentColor: Record<SentimentLabel, string> = {
  positive: "text-risk-low", neutral: "text-slate-400", negative: "text-risk-critical", mixed: "text-risk-medium",
};

export const metadata = { title: "ReputationOS" };

function scoreTone(v: number): string {
  return v >= 70 ? "text-risk-low" : v >= 45 ? "text-risk-medium" : "text-risk-high";
}

export default async function ReputationPage() {
  const { subject } = await (await getDataSource()).getDataset();
  const moduleData = await getModuleData();
  const { mentions, sentimentTrend } = moduleData;
  const overview = reputationOverview(mentions);
  const coverage = monitoringCoverage(mentions);
  const s = overview.scores;
  const repHistory = (await getScoreHistory()).find((h) => h.kind === "reputation");
  const trend = repHistory?.points.map((p) => p.value) ?? [];

  const scoreCards = [
    { label: "Sentiment", value: s.sentiment },
    { label: "Authority", value: s.authority },
    { label: "Reach", value: s.reach },
    { label: "Influence", value: s.influence },
    { label: "Brand perception", value: s.brandPerception },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="ReputationOS"
        subtitle={`Monitoring, analysis, growth, SEO, media, recovery, social & intelligence for ${subject.displayName} — one reputation operating system.`}
        actions={
          <div className="flex flex-col items-end gap-2">
            <DataBadge live={moduleData.live} />
            <ReputationScanButton />
          </div>
        }
      />

      <ReputationTabs />

      {/* Health + 5-axis analysis */}
      <Card className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex shrink-0 items-center gap-4">
            <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full ring-4 ring-brand/20">
              <span className={cn("text-3xl font-bold", scoreTone(overview.health))}>{overview.health}</span>
              <span className="text-[10px] text-slate-400">health</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Reputation health</p>
              <p className="text-xs text-slate-500">{overview.negatives} negative · {overview.defamation} defamation flag(s)</p>
              <p className="mt-1 text-xs text-slate-500">{overview.channelsMonitored} channels monitored 24/7</p>
              {trend.length >= 2 && (
                <div className="mt-2 w-40">
                  <LineChart values={trend} height={32} color="#22c55e" />
                  <p className="text-[10px] text-slate-500">Health trend</p>
                </div>
              )}
            </div>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-5">
            {scoreCards.map((c) => (
              <div key={c.label} className="rounded-xl border border-border bg-bg-subtle/40 p-3 text-center">
                <p className={cn("text-2xl font-bold", scoreTone(c.value))}>{c.value}</p>
                <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">{c.label}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Monitoring coverage */}
      <Card className="p-4">
        <SectionTitle title="Monitoring coverage" subtitle="Always-on across every channel where the conversation happens" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {coverage.map((c) => (
            <div key={c.channel} className="flex items-center justify-between rounded-lg border border-border bg-bg-subtle/40 px-3 py-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-risk-low" />
                <span className="text-xs text-slate-300">{c.label}</span>
              </div>
              <span className="text-xs font-semibold text-white">{c.mentions}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Sentiment trend */}
      <Card className="p-4">
        <SectionTitle title="Sentiment trend" subtitle="Positive / neutral / negative volume, last 14 days" />
        <SentimentBars days={sentimentTrend} />
        <div className="mt-3 flex gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-risk-low/70" /> Positive</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-slate-600" /> Neutral</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-risk-critical/70" /> Negative</span>
        </div>
      </Card>

      {/* Mentions */}
      <Card className="p-0">
        <div className="border-b border-border p-5"><SectionTitle title="Mentions" subtitle="Brand, news, search, social, forums & reviews" /></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Mention</th>
                <th className="px-5 py-3 font-medium">Channel</th>
                <th className="px-5 py-3 font-medium">Sentiment</th>
                <th className="px-5 py-3 font-medium">Rank</th>
                <th className="px-5 py-3 font-medium">Detected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {mentions.map((m) => (
                <tr key={m.id} className="hover:bg-bg-elevated/50">
                  <td className="max-w-md px-5 py-3">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white">{m.title}</p>
                      {m.isDefamatory && (
                        <span className="rounded bg-risk-critical/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-risk-critical">Defamatory</span>
                      )}
                    </div>
                    <p className="truncate text-xs text-slate-500">{m.sourceName} — {m.excerpt}</p>
                  </td>
                  <td className="px-5 py-3"><Pill>{titleCase(m.channel)}</Pill></td>
                  <td className={cn("px-5 py-3 font-medium", sentColor[m.sentiment])}>{titleCase(m.sentiment)}</td>
                  <td className="px-5 py-3 text-slate-300">{m.searchRank ? `#${m.searchRank}` : "—"}</td>
                  <td className="px-5 py-3 text-slate-500">{timeAgo(m.detectedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
