import { Card, RiskBadge, Pill, SectionTitle, StatCard, SentimentBars } from "@/components/ui";
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

export default async function ReputationPage() {
  const { subject } = await (await getDataSource()).getDataset();
  const { mentions, sentimentTrend } = await getModuleData();
  const repScore = reputationScore(mentions);
  const negatives = mentions.filter((m) => m.sentiment === "negative");
  const defamatory = mentions.filter((m) => m.isDefamatory);
  const net = sentimentTrend.at(-1)?.netScore ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">ReputationOS</h1>
        <p className="mt-1 text-sm text-slate-400">
          Search visibility, brand & news monitoring, sentiment analysis, defamation tracking and SEO recovery for {subject.displayName}.
        </p>
      </div>

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
