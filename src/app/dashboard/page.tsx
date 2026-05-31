import Link from "next/link";
import {
  Sparkles, TrendingDown, TrendingUp,
  Radar, Trash2, Layers,
} from "lucide-react";
import {
  Card,
  RiskBadge,
  ScoreGauge,
} from "@/components/ui";
import { ActivityStream } from "@/components/activity-stream";
import { AgentRoster } from "@/components/agent-roster";
import { LiveRefresh } from "@/components/live-refresh";
import { CorrelationGraphView, CorrelationLegend } from "@/components/correlation-graph";
import {
  AreaChart, AxisLabels, ProgressMeter, RadarChart, RankedBars, StackedTimeline,
} from "@/components/viz-advanced";
import { getDataSource } from "@/lib/data";
import { getModuleData } from "@/lib/data/modules";
import { getScoreHistory } from "@/lib/data/scores";
import { getAuditLog } from "@/lib/audit/audit";
import { getEntitlements } from "@/lib/billing/subscription";
import { availableAgents } from "@/lib/billing/entitlements";
import { buildFeed, activeSeverityCount } from "@/lib/events/feed";
import { computeScoreSet } from "@/lib/scoring/scores";
import { scoreToLevel } from "@/lib/scoring/risk-score";
import {
  agentRoster, attackSurface, discoveryVelocity, exposureTimeline,
  onlineAgentCount, remediationProgress, threatTimeline, topExposureSources,
} from "@/lib/intelligence/command-center";
import { buildCorrelationGraph, correlationStats } from "@/lib/intelligence/correlation";
import { exposureToFinding, runPlaybooks, summarizeRuns, threatToFinding } from "@/lib/agents/playbooks";
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
  const entitlements = await getEntitlements();
  const available = availableAgents(entitlements);
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

  // Operational intelligence (pure, derived from the real dataset).
  const roster = agentRoster(data.agents, mod.agentActions, available);
  const onlineAgents = onlineAgentCount(roster);
  const totalAgents = roster.length;
  const expTimeline = exposureTimeline(data.exposures, 30);
  const thrTimeline = threatTimeline(data.threats, 30);
  const velocity = discoveryVelocity(data.exposures, data.threats, 30);
  const remediation = remediationProgress(removals);
  const sources = topExposureSources(data.exposures, 6);
  const surface = attackSurface(data.exposures);
  const surfaceTotal = surface.reduce((s, a) => s + a.count, 0);
  const graph = buildCorrelationGraph(data.subject.displayName, data.exposures, data.threats);
  const graphStats = correlationStats(graph);
  const playbookRuns = runPlaybooks([
    ...data.exposures.map(exposureToFinding),
    ...data.threats.map(threatToFinding),
  ]);
  const playbooks = summarizeRuns(playbookRuns);

  // Surface the most recent autonomous playbook executions in the live stream.
  const playbookFeed = playbookRuns.slice(0, 6).map((r, i) => ({
    id: `${r.playbookId}-${r.finding.id}-${i}`,
    at: new Date(Date.now() - (i + 1) * 11 * 60_000).toISOString(),
    playbookName: r.playbookName,
    owner: r.owner,
    fullyAutonomous: r.fullyAutonomous,
    autoSteps: r.autoSteps,
    approvalSteps: r.approvalSteps,
    level: r.finding.riskLevel,
  }));

  const feed = buildFeed({
    agentActions: mod.agentActions,
    auditLog,
    threats: data.threats,
    incidents: mod.incidents,
    removals,
    playbookRuns: playbookFeed,
  });
  const sev = activeSeverityCount(feed);
  const live = ds.live;
  const band = BANNER[scoreToLevel(score.overall)];

  const trendPoints = scoreHistory.find((s) => s.kind === "overall")?.points ?? [];

  return (
    <div className="space-y-2.5">
      {/* ── Command bar — title + live posture in one dense line ───────────── */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-white">Command Center</h1>
          <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-bold tracking-wide", band.ring, band.text)}>
            <span className="relative flex h-2 w-2">
              <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-75", band.dot, live && "animate-ping")} />
              <span className={cn("relative inline-flex h-2 w-2 rounded-full", band.dot)} />
            </span>
            {band.label}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <Stat label="Exposure" value={String(score.overall)} />
          <Stat label="Critical" value={String(sev.critical)} tone="text-risk-critical" />
          <Stat label="High" value={String(sev.high)} tone="text-risk-high" />
          <Stat label="Active threats" value={String(activeThreats.length)} />
          <Stat label="Agents" value={`${onlineAgents}/${totalAgents}`} tone="text-risk-low" />
          <LiveRefresh intervalMs={30_000} />
        </div>
      </div>

      {/* ── KPI strip — compact, horizontal ───────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <KpiTile icon={<Radar className="h-3.5 w-3.5 text-brand-fg" />} label="Discovery / wk" value={velocity.last7} sub="new exposures" delta={velocity.deltaPct} deltaGoodWhenNegative spark={velocity.perDay} />
        <KpiTile icon={<Trash2 className="h-3.5 w-3.5 text-risk-low" />} label="Remediation" value={`${remediation.percentComplete}%`} sub={`${remediation.removed + remediation.monitoring}/${remediation.total} neutralized`} />
        <KpiTile icon={<Sparkles className="h-3.5 w-3.5 text-risk-low" />} label="Automation" value={`${playbooks.automationRate}%`} sub={`${playbooks.autonomousRuns}/${playbooks.totalRuns} runs autonomous`} />
        <KpiTile icon={<Layers className="h-3.5 w-3.5 text-slate-300" />} label="Attack surface" value={surfaceTotal} sub={`${surface.filter((a) => a.count > 0).length} vectors · ${graphStats.sources} sources`} />
      </div>

      {/* ── TIER 1 — score · operations stream · agents (above the fold) ───── */}
      <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-12">
        <div className="space-y-2.5 xl:col-span-3">
          <Card className="p-3">
            <div className="flex items-center gap-3">
              <ScoreGauge score={score.overall} size={96} />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-wide text-slate-400">Exposure score</p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="text-xl font-bold text-white">{score.overall}</span>
                  <RiskBadge level={scoreToLevel(score.overall)} />
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wide text-slate-500">Risk trend</span>
                  <span className="text-[10px] text-slate-500">{trendPoints.length} snapshots</span>
                </div>
                <RiskEvolution history={scoreHistory} current={scores.overall} compact />
              </div>
            </div>
            <div className="mt-2 grid grid-cols-5 gap-2 border-t border-border pt-2">
              <AxisStat label="Identity" value={score.identity} />
              <AxisStat label="Reputation" value={score.reputation} />
              <AxisStat label="Financial" value={score.financial} />
              <AxisStat label="Security" value={score.security} />
              <AxisStat label="Family" value={score.family} />
            </div>
          </Card>
        </div>

        <div className="xl:col-span-6">
          <ActivityStream events={feed} live={live} />
        </div>

        <div className="xl:col-span-3">
          <AgentRoster roster={roster} online={onlineAgents} total={totalAgents} live={live} />
        </div>
      </div>

      {/* ── TIER 1 — recommendations · autonomous response (horizontal) ────── */}
      <div className="grid grid-cols-1 items-start gap-2.5 lg:grid-cols-2">
        <Card className="p-3">
          <SectionTitleRow title="AI recommendations" href="/dashboard/recommendations" />
          <ul className="mt-1 divide-y divide-border">
            {data.recommendations.slice(0, 3).map((r) => (
              <li key={r.id} className="flex items-center gap-2.5 py-1.5">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-brand" />
                <span className="min-w-0 flex-1 truncate text-sm text-white">{r.title}</span>
                <span className="shrink-0 text-[11px] font-semibold text-risk-low">−{r.impact}</span>
                <span className="hidden shrink-0 text-[10px] text-slate-500 sm:inline">{titleCase(r.agent)}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-3">
          <SectionTitleRow title="Autonomous response" href="/dashboard/playbooks" />
          <div className="mt-1.5 grid grid-cols-4 gap-2">
            <MiniStat value={`${playbooks.automationRate}%`} label="Automated" tone="text-risk-low" />
            <MiniStat value={String(playbooks.totalRuns)} label="Runs" />
            <MiniStat value={String(playbooks.activePlaybooks)} label="Playbooks" />
            <MiniStat value={String(playbooks.approvalSteps)} label="To approve" tone="text-risk-medium" />
          </div>
        </Card>
      </div>

      {/* ── TIER 2 — operational intelligence ──────────────────────────────── */}
      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
        <Card className="p-3">
          <SectionTitleRow title="Exposure discovery · 30d" right={<VelocityBadge delta={velocity.deltaPct} />} />
          <StackedTimeline buckets={expTimeline} height={72} ariaLabel="Exposures discovered per day" />
          <SeverityLegend />
        </Card>
        <Card className="p-3">
          <SectionTitleRow title="Threat activity · 30d" href="/dashboard/threats" linkLabel="Feed" />
          <StackedTimeline buckets={thrTimeline} height={72} ariaLabel="Threats detected per day" />
          <SeverityLegend />
        </Card>
      </div>

      <div className="grid grid-cols-1 items-start gap-2.5 lg:grid-cols-3">
        <Card className="p-3">
          <SectionTitleRow title="Attack surface" />
          <div className="flex items-center justify-between gap-2">
            <RadarChart axes={surface} size={168} />
            <ul className="grid grid-cols-1 gap-y-0.5 text-xs">
              {surface.filter((a) => a.count > 0).sort((a, b) => b.count - a.count).slice(0, 6).map((a) => (
                <li key={a.key} className="flex items-center justify-between gap-3">
                  <span className="text-slate-400">{a.label}</span>
                  <span className="font-semibold text-white">{a.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
        <Card className="p-3">
          <SectionTitleRow title="Top exposure sources" href="/dashboard/exposures" linkLabel="Inventory" />
          {sources.length > 0 ? <RankedBars items={sources} /> : <p className="text-sm text-slate-500">No exposures indexed yet.</p>}
        </Card>
        <Card className="p-3">
          <SectionTitleRow title="Remediation" href="/dashboard/removals" linkLabel="Manage" />
          <ProgressMeter percent={remediation.percentComplete} stages={remediation.stages} />
        </Card>
      </div>

      {/* ── TIER 3 — detailed analytics ────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-3">
        <Card className="p-3 lg:col-span-2">
          <SectionTitleRow
            title="Threat correlation"
            right={<span className="text-[10px] text-slate-500">{graphStats.sources} src · {graphStats.categories} cat · {graphStats.criticalLinks} high-risk</span>}
          />
          <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-center">
              <CorrelationGraphView graph={graph} size={300} />
            </div>
            <div className="space-y-2">
              <CorrelationLegend />
              {graphStats.topSource && (
                <div className="rounded-lg border border-border bg-bg-subtle/50 p-2.5">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">Most-exposed source</p>
                  <p className="text-sm font-semibold text-white">{graphStats.topSource.label}</p>
                  <p className="text-[11px] text-slate-400">{graphStats.topSource.weight} items · {graphStats.topSource.level}</p>
                </div>
              )}
              {graphStats.topCategory && (
                <div className="rounded-lg border border-border bg-bg-subtle/50 p-2.5">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">Most-exposed data type</p>
                  <p className="text-sm font-semibold text-white">{graphStats.topCategory.label}</p>
                  <p className="text-[11px] text-slate-400">{graphStats.topCategory.weight} items · {graphStats.topCategory.level}</p>
                </div>
              )}
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <SectionTitleRow title="Suite risk scores" />
          <div className="grid grid-cols-2 gap-2">
            {suiteScores.map((s) => {
              const level = scoreToLevel(s.value);
              return (
                <div key={s.label} className="rounded-lg border border-border bg-bg-subtle/60 p-2 text-center">
                  <p className={cn("text-lg font-bold", `text-risk-${level}`)}>{s.value}</p>
                  <p className="text-[10px] text-slate-400">{s.label}</p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Threat feed — full list (Tier 3) */}
      <Card className="p-3">
        <SectionTitleRow title="Threat feed" href="/dashboard/threats" />
        <ul className="mt-1 divide-y divide-border">
          {data.threats.slice(0, 5).map((t) => (
            <li key={t.id} className="flex items-center gap-2.5 py-1.5">
              <RiskBadge level={t.riskLevel} />
              <span className="min-w-0 flex-1 truncate text-sm text-white">{t.title}</span>
              <span className="shrink-0 text-[10px] text-slate-500">{titleCase(t.kind)} · {timeAgo(t.detectedAt)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

/* ── Compact command-bar stat ────────────────────────────────────────────── */
function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-[11px] uppercase tracking-wide text-slate-500">{label}</span>
      <span className={cn("text-sm font-bold text-white", tone)}>{value}</span>
    </span>
  );
}

/** Compact axis score chip — value over label, color-coded by severity. */
function AxisStat({ label, value }: { label: string; value: number }) {
  const level = scoreToLevel(value);
  return (
    <div className="text-center">
      <p className={cn("text-base font-bold", `text-risk-${level}`)}>{value}</p>
      <p className="text-[9px] uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  );
}

function MiniStat({ value, label, tone }: { value: string; label: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg-subtle/50 p-2 text-center">
      <p className={cn("text-lg font-bold text-white", tone)}>{value}</p>
      <p className="text-[10px] text-slate-500">{label}</p>
    </div>
  );
}

/** Dense one-line section header with an optional link or right-slot. */
function SectionTitleRow({
  title, href, linkLabel = "View all", right,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      {right ?? (href && (
        <Link href={href} className="text-xs font-medium text-brand-fg hover:underline">{linkLabel}</Link>
      ))}
    </div>
  );
}

/* ── Local presentational helpers ────────────────────────────────────────── */

function KpiTile({
  icon, label, value, sub, delta, deltaGoodWhenNegative, spark,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub: string;
  delta?: number;
  deltaGoodWhenNegative?: boolean;
  spark?: number[];
}) {
  const showDelta = typeof delta === "number" && delta !== 0;
  const good = deltaGoodWhenNegative ? (delta ?? 0) < 0 : (delta ?? 0) > 0;
  const Arrow = (delta ?? 0) < 0 ? TrendingDown : TrendingUp;
  return (
    <Card className="flex flex-col gap-1 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
        {icon}
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className="text-2xl font-bold text-white">{value}</span>
        {showDelta && (
          <span className={cn("inline-flex items-center gap-0.5 text-xs font-semibold", good ? "text-risk-low" : "text-risk-high")}>
            <Arrow className="h-3 w-3" />
            {Math.abs(delta!)}%
          </span>
        )}
      </div>
      <span className="text-[11px] text-slate-500">{sub}</span>
      {spark && spark.length > 1 && (
        <div className="mt-1">
          <AreaChart values={spark} height={28} color="#6366f1" highlightLast={false} />
        </div>
      )}
    </Card>
  );
}

function RiskEvolution({
  history,
  current,
  compact,
}: {
  history: { kind: string; points: { date: string; value: number }[] }[];
  current: number;
  compact?: boolean;
}) {
  const overall = history.find((s) => s.kind === "overall")?.points ?? [];
  const hasHistory = overall.length >= 2;
  const values = hasHistory ? overall.map((p) => p.value) : [current, current];
  const labels = hasHistory
    ? overall.map((p) => {
        const d = new Date(p.date);
        return `${d.getMonth() + 1}/${d.getDate()}`;
      })
    : [];
  return (
    <>
      <AreaChart values={values} height={compact ? 64 : 128} color="#6366f1" />
      {!compact && labels.length > 0 && <AxisLabels labels={labels} />}
    </>
  );
}

function VelocityBadge({ delta }: { delta: number }) {
  if (delta === 0) return <span className="text-xs text-slate-500">stable</span>;
  const up = delta > 0;
  const Arrow = up ? TrendingUp : TrendingDown;
  // More discoveries = more exposure surfacing = worse (red).
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-semibold", up ? "text-risk-high" : "text-risk-low")}>
      <Arrow className="h-3 w-3" />
      {Math.abs(delta)}% vs last week
    </span>
  );
}

function SeverityLegend() {
  const items: { level: RiskLevel; label: string }[] = [
    { level: "critical", label: "Critical" },
    { level: "high", label: "High" },
    { level: "medium", label: "Medium" },
    { level: "low", label: "Low" },
  ];
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
      {items.map((it) => (
        <span key={it.level} className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
          <span className={cn("h-2 w-2 rounded-full", `bg-risk-${it.level}`)} />
          {it.label}
        </span>
      ))}
    </div>
  );
}
