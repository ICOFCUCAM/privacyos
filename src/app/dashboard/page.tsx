import Link from "next/link";
import { ArrowRight, Sparkles, ShieldCheck } from "lucide-react";
import {
  AxisBar,
  Card,
  RiskBadge,
  ScoreGauge,
  SectionTitle,
  StatCard,
} from "@/components/ui";
import { ActivityStream } from "@/components/activity-stream";
import { ScoreTrendCard } from "@/components/score-trend";
import { getDataSource } from "@/lib/data";
import { getModuleData } from "@/lib/data/modules";
import { getScoreHistory } from "@/lib/data/scores";
import { getAuditLog } from "@/lib/audit/audit";
import { buildFeed, activeSeverityCount } from "@/lib/events/feed";
import { computeScoreSet } from "@/lib/scoring/scores";
import { scoreToLevel } from "@/lib/scoring/risk-score";
import { cn, timeAgo, titleCase } from "@/lib/ui";
import type { RiskLevel } from "@/lib/types";

const BANNER: Record<RiskLevel, { label: string; ring: string; text: string; dot: string }> = {
  low: { label: "LOW", ring: "border-risk-low/40 bg-risk-low/10", text: "text-risk-low", dot: "bg-risk-low" },
  medium: { label: "GUARDED", ring: "border-risk-medium/40 bg-risk-medium/10", text: "text-risk-medium", dot: "bg-risk-medium" },
  high: { label: "ELEVATED", ring: "border-risk-high/40 bg-risk-high/10", text: "text-risk-high", dot: "bg-risk-high" },
  critical: { label: "CRITICAL", ring: "border-risk-critical/40 bg-risk-critical/10", text: "text-risk-critical", dot: "bg-risk-critical" },
};

export default async function OverviewPage() {
  const ds = await getDataSource();
  const data = await ds.getDataset();
  const mod = await getModuleData();
  const scoreHistory = await getScoreHistory();
  const removals = await ds.listRemovals();
  const auditLog = await getAuditLog(30);
  const score = data.riskScore;
  const scores = computeScoreSet({
    risk: score,
    mentions: mod.mentions,
    incidents: mod.incidents,
    credentialLeaks: mod.credentialLeaks,
    domainRisks: mod.domainRisks,
    employeeExposures: mod.employeeExposures,
  });
  const suiteScores = [
    { label: "Privacy", value: scores.privacy },
    { label: "Identity", value: scores.identity },
    { label: "Reputation", value: scores.reputation },
    { label: "Executive", value: scores.executive },
    { label: "Business", value: scores.business },
    { label: "Overall", value: scores.overall },
  ];
  const activeThreats = data.threats.filter((t) => !t.acknowledged);
  const openCases = data.cases.filter((c) => c.status !== "resolved");
  const runningAgents = data.agents.filter((a) => a.status === "running");

  const feed = buildFeed({
    agentActions: mod.agentActions,
    auditLog,
    threats: data.threats,
    incidents: mod.incidents,
    removals,
  });
  const sev = activeSeverityCount(feed);
  const live = ds.live;
  const band = BANNER[scoreToLevel(score.overall)];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Command Center</h1>
          <p className="mt-1 text-sm text-slate-400">
            Live defense console for your digital identity — every surface, every agent, in real time.
          </p>
        </div>
        <span className="hidden items-center gap-2 rounded-full border border-border bg-bg-elevated px-3 py-1.5 text-xs font-medium text-slate-300 sm:inline-flex">
          <ShieldCheck className="h-3.5 w-3.5 text-risk-low" />
          {runningAgents.length}/8 agents · 24/7 monitoring
        </span>
      </div>

      {/* Threat-level banner */}
      <div className={cn("flex flex-wrap items-center justify-between gap-3 rounded-xl border px-5 py-3", band.ring)}>
        <div className="flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-75", band.dot, live && "animate-ping")} />
            <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", band.dot)} />
          </span>
          <span className="text-sm text-slate-300">Threat level</span>
          <span className={cn("text-lg font-bold tracking-wide", band.text)}>{band.label}</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-400">Exposure <span className="font-semibold text-white">{score.overall}</span></span>
          <span className="text-risk-critical">{sev.critical} critical</span>
          <span className="text-risk-high">{sev.high} high</span>
          <span className="text-slate-400">{activeThreats.length} active threats</span>
        </div>
      </div>

      {/* Hero: score + live operations stream */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4">
          <Card className="flex items-center gap-6">
            <ScoreGauge score={score.overall} />
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Exposure score</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-2xl font-bold text-white">{score.overall}</span>
                <RiskBadge level={scoreToLevel(score.overall)} />
              </div>
              <p className="mt-2 text-xs text-slate-500">Lower is safer. Recomputed continuously.</p>
            </div>
          </Card>
          <Card>
            <SectionTitle title="Risk breakdown" subtitle="Five-axis exposure model" />
            <div className="space-y-3">
              <AxisBar label="Identity" value={score.identity} />
              <AxisBar label="Reputation" value={score.reputation} />
              <AxisBar label="Financial" value={score.financial} />
              <AxisBar label="Security" value={score.security} />
              <AxisBar label="Family" value={score.family} />
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <ActivityStream events={feed} live={live} />
        </div>
      </div>

      {/* Suite risk scores */}
      <Card>
        <SectionTitle title="Suite risk scores" subtitle="PrivacyOS · ReputationOS · ExecutiveOS · BusinessOS (0–100, higher = more risk)" />
        <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
          {suiteScores.map((s) => {
            const level = scoreToLevel(s.value);
            return (
              <div key={s.label} className="rounded-lg border border-border bg-bg-subtle/60 p-3 text-center">
                <p className={cn("text-2xl font-bold", `text-risk-${level}`)}>{s.value}</p>
                <p className="mt-0.5 text-xs text-slate-400">{s.label}</p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Score trend */}
      <ScoreTrendCard
        history={scoreHistory}
        current={{ overall: scores.overall, privacy: scores.privacy, identity: scores.identity }}
      />

      {/* Stat row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active threats" value={activeThreats.length} accent="text-risk-critical" hint="Unacknowledged" />
        <StatCard label="Exposures tracked" value={data.exposures.length} hint={`${data.exposures.filter((e) => e.status === "removed").length} removed`} />
        <StatCard label="Open cases" value={openCases.length} hint="Across all agents" />
        <StatCard label="Agents online" value={`${runningAgents.length}/8`} accent="text-risk-low" hint="24/7 monitoring" />
      </div>

      {/* Threats + recommendations */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle
            title="Threat feed"
            action={
              <Link href="/dashboard/threats" className="text-xs font-medium text-brand-fg hover:underline">
                View all
              </Link>
            }
          />
          <ul className="space-y-3">
            {data.threats.slice(0, 4).map((t) => (
              <li key={t.id} className="flex items-start gap-3">
                <RiskBadge level={t.riskLevel} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{t.title}</p>
                  <p className="truncate text-xs text-slate-500">
                    {titleCase(t.kind)} · {timeAgo(t.detectedAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <SectionTitle
            title="AI recommendations"
            action={
              <Link href="/dashboard/recommendations" className="text-xs font-medium text-brand-fg hover:underline">
                View all
              </Link>
            }
          />
          <ul className="space-y-3">
            {data.recommendations.slice(0, 4).map((r) => (
              <li key={r.id} className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{r.title}</p>
                  <p className="text-xs text-slate-500">
                    {titleCase(r.agent)} agent · −{r.impact} pts
                  </p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-600" />
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
