import { Card, DataBadge, PageHeader, RiskBadge, Pill, SectionTitle, StatCard, SentimentBars } from "@/components/ui";
import { ReputationScanButton } from "@/components/reputation-scan-button";
import { getDataSource } from "@/lib/data";
import { getModuleData } from "@/lib/data/modules";
import { reputationScore } from "@/lib/scoring/scores";
import { scoreToLevel } from "@/lib/scoring/risk-score";
import { cn, timeAgo, titleCase } from "@/lib/ui";
import type { SentimentLabel } from "@/lib/suite-types";

const sentColor: Record<SentimentLabel, string> = {
  positive: "text-risk-low",
  neutral: "text-slate-400",
  negative: "text-risk-critical",
  mixed: "text-risk-medium",
};

export const metadata = { title: "ReputationOS" };

export default async function ReputationPage() {
  const { subject } = await (await getDataSource()).getDataset();
  const moduleData = await getModuleData();
  const { mentions, sentimentTrend } = moduleData;
  const repScore = reputationScore(mentions);
  const negatives = mentions.filter((m) => m.sentiment === "negative");
  const defamatory = mentions.filter((m) => m.isDefamatory);
  const net = sentimentTrend.at(-1)?.netScore ?? 0;
  const byChannel = mentions.reduce<Record<string, number>>((a, m) => ((a[m.channel] = (a[m.channel] ?? 0) + 1), a), {});
  const channels = Object.entries(byChannel).sort((x, y) => y[1] - x[1]);
  const maxCh = Math.max(1, ...channels.map(([, n]) => n));

  return (
    <div className="space-y-6">
      <PageHeader
        title="ReputationOS"
        subtitle={`Search visibility, brand & news monitoring, sentiment analysis, defamation tracking and SEO recovery for ${subject.displayName}.`}
        actions={
          <div className="flex flex-col items-end gap-2">
            <DataBadge live={moduleData.live} />
            <ReputationScanButton />
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Reputation risk" value={repScore} accent={cn(scoreToLevel(repScore) === "critical" || scoreToLevel(repScore) === "high" ? "text-risk-high" : "text-white")} hint="Higher = more at risk" />
        <StatCard label="Net sentiment" value={net.toFixed(2)} accent={net < 0 ? "text-risk-critical" : "text-risk-low"} hint="Trailing 14 days" />
        <StatCard label="Negative mentions" value={negatives.length} accent="text-risk-high" />
        <StatCard label="Defamation flags" value={defamatory.length} accent="text-risk-critical" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionTitle title="Sentiment trend" subtitle="Positive / neutral / negative volume, last 14 days" />
          <SentimentBars days={sentimentTrend} />
          <div className="mt-3 flex gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-risk-low/70" /> Positive</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-slate-600" /> Neutral</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-risk-critical/70" /> Negative</span>
          </div>
        </Card>
        <Card>
          <SectionTitle title="SEO recovery plan" />
          <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-300">
            <li>Publish authoritative owned profiles to reclaim page one.</li>
            <li>Issue verified press to dilute negative ranking.</li>
            <li>Optimize LinkedIn & bio for the subject&apos;s name.</li>
            <li>Escalate defamatory items to the Legal engine.</li>
          </ol>
        </Card>
      </div>

      <Card>
        <SectionTitle title="Mentions by channel" subtitle="Where the conversation is happening" />
        <div className="space-y-2">
          {channels.map(([ch, n]) => (
            <div key={ch} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-xs text-slate-400">{titleCase(ch)}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg-subtle">
                <div className="h-full rounded-full bg-brand" style={{ width: `${(n / maxCh) * 100}%` }} />
              </div>
              <span className="w-6 text-right text-xs text-slate-300">{n}</span>
            </div>
          ))}
        </div>
      </Card>

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
