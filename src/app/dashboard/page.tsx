import Link from "next/link";
import {
  ArrowRight, Sparkles, ShieldCheck, TrendingDown, TrendingUp,
  Radar, Trash2, Target, Layers,
} from "lucide-react";
import {
  AxisBar,
  Card,
  RiskBadge,
  ScoreGauge,
  SectionTitle,
} from "@/components/ui";
import { ActivityStream } from "@/components/activity-stream";
import { ScoreTrendCard } from "@/components/score-trend";
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

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Command Center</h1>
          <p className="mt-1 text-sm text-slate-400">
            Live defense console for your digital identity — every surface, every agent, in real time.
          </p>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-elevated px-3 py-1.5 text-xs font-medium text-slate-300">
            <ShieldCheck className="h-3.5 w-3.5 text-risk-low" />
            {onlineAgents}/{totalAgents} agents · 24/7
          </span>
          <LiveRefresh intervalMs={30_000} />
        </div>
      </div>

      {/* Threat-level banner */}
      <div className={cn("flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-2.5", band.ring)}>
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

      {/* Operational KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile
          icon={<Radar className="h-4 w-4 text-brand-fg" />}
          label="Discovery velocity"
          value={velocity.last7}
          sub="new this week"
          delta={velocity.deltaPct}
          deltaGoodWhenNegative
          spark={velocity.perDay}
        />
        <KpiTile
          icon={<Trash2 className="h-4 w-4 text-risk-low" />}
          label="Remediation"
          value={`${remediation.percentComplete}%`}
          sub={`${remediation.removed + remediation.monitoring}/${remediation.total} neutralized`}
        />
        <KpiTile
          icon={<Target className="h-4 w-4 text-risk-high" />}
          label="Active threats"
          value={activeThreats.length}
          sub={`${sev.critical} critical · ${sev.high} high`}
        />
        <KpiTile
          icon={<Layers className="h-4 w-4 text-slate-300" />}
          label="Attack surface"
          value={surfaceTotal}
          sub={`across ${surface.filter((a) => a.count > 0).length} vectors`}
        />
      </div>

      {/* Hero row: score + risk breakdown · operations stream · agent roster */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <div className="space-y-3 xl:col-span-3">
          <Card className="flex items-center gap-4 p-4">
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
          <Card className="p-4">
            <SectionTitle title="Risk breakdown" subtitle="Five-axis exposure model" />
            <div className="space-y-2.5">
              <AxisBar label="Identity" value={score.identity} />
              <AxisBar label="Reputation" value={score.reputation} />
              <AxisBar label="Financial" value={score.financial} />
              <AxisBar label="Security" value={score.security} />
              <AxisBar label="Family" value={score.family} />
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

      {/* Autonomous response — the automation moat at a glance */}
      <Card className="p-4">
        <SectionTitle
          title="Autonomous response"
          subtitle="Live findings matched to response playbooks and executed step by step"
          action={
            <Link href="/dashboard/playbooks" className="text-xs font-medium text-brand-fg hover:underline">
              View playbooks
            </Link>
          }
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          <div className="rounded-lg border border-border bg-bg-subtle/50 p-3">
            <p className="text-2xl font-bold text-risk-low">{playbooks.automationRate}%</p>
            <p className="mt-0.5 text-[11px] text-slate-500">Steps automated</p>
          </div>
          <div className="rounded-lg border border-border bg-bg-subtle/50 p-3">
            <p className="text-2xl font-bold text-white">{playbooks.totalRuns}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">Workflow runs</p>
          </div>
          <div className="rounded-lg border border-border bg-bg-subtle/50 p-3">
            <p className="text-2xl font-bold text-white">{playbooks.autonomousRuns}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">Fully autonomous</p>
          </div>
          <div className="rounded-lg border border-border bg-bg-subtle/50 p-3">
            <p className="text-2xl font-bold text-white">{playbooks.activePlaybooks}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">Active playbooks</p>
          </div>
          <div className="rounded-lg border border-border bg-bg-subtle/50 p-3">
            <p className="text-2xl font-bold text-risk-medium">{playbooks.approvalSteps}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">Awaiting approval</p>
          </div>
        </div>
      </Card>

      {/* Intelligence row: exposure timeline + threat timeline */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card className="p-4">
          <SectionTitle
            title="Exposure discovery — 30 days"
            subtitle={`${velocity.windowTotal} discoveries · agents indexing continuously`}
            action={<VelocityBadge delta={velocity.deltaPct} />}
          />
          <StackedTimeline buckets={expTimeline} height={88} ariaLabel="Exposures discovered per day" />
          <SeverityLegend />
        </Card>
        <Card className="p-4">
          <SectionTitle
            title="Threat activity — 30 days"
            subtitle={`${data.threats.length} threats detected across all sources`}
            action={
              <Link href="/dashboard/threats" className="text-xs font-medium text-brand-fg hover:underline">
                Threat feed
              </Link>
            }
          />
          <StackedTimeline buckets={thrTimeline} height={88} ariaLabel="Threats detected per day" />
          <SeverityLegend />
        </Card>
      </div>

      {/* Risk evolution (area) + remediation progress */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <SectionTitle
            title="Risk evolution"
            subtitle="Overall exposure score over the monitoring window"
            action={
              <span className="text-xs text-slate-500">
                {scoreHistory.find((s) => s.kind === "overall")?.points.length ?? 0} snapshots
              </span>
            }
          />
          <RiskEvolution history={scoreHistory} current={scores.overall} />
        </Card>
        <Card className="p-4">
          <SectionTitle title="Remediation progress" subtitle="Broker & takedown portfolio" />
          <ProgressMeter percent={remediation.percentComplete} stages={remediation.stages} />
          <Link
            href="/dashboard/removals"
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-brand-fg hover:underline"
          >
            Manage removals <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Card>
      </div>

      {/* Situational awareness: attack surface + top sources */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card className="p-4">
          <SectionTitle
            title="Identity attack surface"
            subtitle="Where your exposure concentrates across identity vectors"
          />
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-between">
            <RadarChart axes={surface} size={196} />
            <ul className="grid w-full grid-cols-2 gap-x-4 gap-y-1 text-xs sm:w-auto">
              {surface
                .filter((a) => a.count > 0)
                .sort((a, b) => b.count - a.count)
                .map((a) => (
                  <li key={a.key} className="flex items-center justify-between gap-3">
                    <span className="text-slate-400">{a.label}</span>
                    <span className="font-semibold text-white">{a.count}</span>
                  </li>
                ))}
            </ul>
          </div>
        </Card>
        <Card className="p-4">
          <SectionTitle
            title="Top exposure sources"
            subtitle="Where your data is surfacing most"
            action={
              <Link href="/dashboard/exposures" className="text-xs font-medium text-brand-fg hover:underline">
                Inventory
              </Link>
            }
          />
          {sources.length > 0 ? (
            <RankedBars items={sources} />
          ) : (
            <p className="text-sm text-slate-500">No exposures indexed yet.</p>
          )}
        </Card>
      </div>

      {/* Threat correlation graph */}
      <Card className="p-4">
        <SectionTitle
          title="Threat correlation"
          subtitle="How your identity connects to the sources and data categories exposing it"
          action={
            <span className="text-xs text-slate-500">
              {graphStats.sources} sources · {graphStats.categories} categories · {graphStats.criticalLinks} high-risk links
            </span>
          }
        />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="flex items-center justify-center lg:col-span-2">
            <CorrelationGraphView graph={graph} />
          </div>
          <div className="space-y-3">
            <CorrelationLegend />
            {graphStats.topSource && (
              <div className="rounded-lg border border-border bg-bg-subtle/50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Most-exposed source</p>
                <p className="mt-0.5 text-sm font-semibold text-white">{graphStats.topSource.label}</p>
                <p className="text-xs text-slate-400">{graphStats.topSource.weight} items · {graphStats.topSource.level} severity</p>
              </div>
            )}
            {graphStats.topCategory && (
              <div className="rounded-lg border border-border bg-bg-subtle/50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Most-exposed data type</p>
                <p className="mt-0.5 text-sm font-semibold text-white">{graphStats.topCategory.label}</p>
                <p className="text-xs text-slate-400">{graphStats.topCategory.weight} items · {graphStats.topCategory.level} severity</p>
              </div>
            )}
            <Link href="/dashboard/exposures" className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-fg hover:underline">
              Explore exposure inventory <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </Card>

      {/* Suite risk scores */}
      <Card className="p-4">
        <SectionTitle title="Suite risk scores" subtitle="PrivacyOS · ReputationOS · ExecutiveOS · BusinessOS (0–100, higher = more risk)" />
        <div className="grid grid-cols-3 gap-2.5 lg:grid-cols-6">
          {suiteScores.map((s) => {
            const level = scoreToLevel(s.value);
            return (
              <div key={s.label} className="rounded-lg border border-border bg-bg-subtle/60 p-2.5 text-center">
                <p className={cn("text-xl font-bold", `text-risk-${level}`)}>{s.value}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">{s.label}</p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Score trend (per-axis minis) */}
      <ScoreTrendCard
        history={scoreHistory}
        current={{ overall: scores.overall, privacy: scores.privacy, identity: scores.identity }}
      />

      {/* Threats + recommendations */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card className="p-4">
          <SectionTitle
            title="Threat feed"
            action={
              <Link href="/dashboard/threats" className="text-xs font-medium text-brand-fg hover:underline">
                View all
              </Link>
            }
          />
          <ul className="space-y-2.5">
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

        <Card className="p-4">
          <SectionTitle
            title="AI recommendations"
            subtitle="What should happen next"
            action={
              <Link href="/dashboard/recommendations" className="text-xs font-medium text-brand-fg hover:underline">
                View all
              </Link>
            }
          />
          <ul className="space-y-2.5">
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
}: {
  history: { kind: string; points: { date: string; value: number }[] }[];
  current: number;
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
      <AreaChart values={values} height={128} color="#6366f1" />
      {labels.length > 0 && <AxisLabels labels={labels} />}
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
