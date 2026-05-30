import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import {
  AxisBar,
  Card,
  RiskBadge,
  ScoreGauge,
  SectionTitle,
  StatCard,
} from "@/components/ui";
import {
  demoAgents,
  demoCases,
  demoExposures,
  demoRecommendations,
  demoRiskScore,
  demoThreats,
} from "@/lib/data/demo";
import { scoreToLevel } from "@/lib/scoring/risk-score";
import { timeAgo, titleCase } from "@/lib/ui";

export default function OverviewPage() {
  const score = demoRiskScore;
  const activeThreats = demoThreats.filter((t) => !t.acknowledged);
  const openCases = demoCases.filter((c) => c.status !== "resolved");
  const runningAgents = demoAgents.filter((a) => a.status === "running");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="mt-1 text-sm text-slate-400">
          Your live digital-risk posture across every monitored surface.
        </p>
      </div>

      {/* Score + axes */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="flex items-center gap-6 lg:col-span-1">
          <ScoreGauge score={score.overall} />
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Exposure score
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-2xl font-bold text-white">{score.overall}</span>
              <RiskBadge level={scoreToLevel(score.overall)} />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Lower is safer. Proprietary five-axis model, recomputed continuously.
            </p>
          </div>
        </Card>

        <Card className="lg:col-span-2">
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

      {/* Stat row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active threats" value={activeThreats.length} accent="text-risk-critical" hint="Unacknowledged" />
        <StatCard label="Exposures tracked" value={demoExposures.length} hint={`${demoExposures.filter((e) => e.status === "removed").length} removed`} />
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
            {demoThreats.slice(0, 4).map((t) => (
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
            {demoRecommendations.slice(0, 4).map((r) => (
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
