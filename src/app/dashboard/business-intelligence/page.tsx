import Link from "next/link";
import {
  TrendingUp, TrendingDown, DollarSign, Repeat, Users,
  Gauge, Bot, Database, ArrowRight, Crown, Briefcase, Star, Shield, Cpu,
} from "lucide-react";
import { Card, PageHeader, SectionTitle } from "@/components/ui";
import { AreaChart } from "@/components/viz-advanced";
import { getBook } from "@/lib/business/book";
import {
  activeLogos, arpu, arr, enterpriseBook, magicNumber, mrr, mrrMovement, retention, revenueByCategory, unitEconomics,
} from "@/lib/business/saas-metrics";
import {
  automationMoat, dataCorpus,
} from "@/lib/business/moat-metrics";
import { liveDetectorAccuracy } from "@/lib/detection/live-accuracy";
import { businessHealth } from "@/lib/business/health";
import { readiness } from "@/lib/compliance/posture";
import { exposureToFinding, runPlaybooks, summarizeRuns, threatToFinding } from "@/lib/agents/playbooks";
import { getModuleData } from "@/lib/data/modules";
import { getDataSource } from "@/lib/data";
import { topExposureSources } from "@/lib/intelligence/command-center";
import { type PlanCategory } from "@/lib/billing/plans";
import { cn } from "@/lib/ui";

export const metadata = { title: "Growth & Revenue" };

const CATEGORY_LABEL: Record<PlanCategory, string> = {
  personal: "PrivacyOS",
  reputation: "ReputationOS",
  executive: "ExecutiveOS",
  business: "BusinessOS",
  ai_addon: "AI Agents",
};

const CATEGORY_ICON: Record<PlanCategory, typeof Crown> = {
  personal: Shield,
  reputation: Star,
  executive: Crown,
  business: Briefcase,
  ai_addon: Cpu,
};

function money(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

export default async function BusinessIntelligencePage() {
  const { accounts, live } = await getBook();
  const mod = await getModuleData();
  const data = await (await getDataSource()).getDataset();

  // SaaS metrics
  const monthly = mrr(accounts);
  const annual = arr(accounts);
  const ret = retention(accounts);
  const ue = unitEconomics(accounts);
  const ent = enterpriseBook(accounts);
  const movement = mrrMovement(accounts);
  const revByCat = revenueByCategory(accounts, CATEGORY_LABEL);
  const arpuVal = arpu(accounts);

  // Detection accuracy — computed by running the real scoring algorithms
  // (lib/detection/scoring) over the live footprint, not modeled TP/FP counts.
  const { detectors: liveDetectors, blended: accuracy } = liveDetectorAccuracy({
    incidents: mod.incidents,
    credentialLeaks: mod.credentialLeaks,
    domainRisks: mod.domainRisks,
    exposures: data.exposures,
    primaryDomain: mod.domains.find((d) => d.isPrimary)?.domain ?? mod.domains[0]?.domain,
  });
  const detectors = liveDetectors.filter((d) => d.evaluated > 0);

  // Automation moat & proprietary corpus.
  const moat = automationMoat(mod.agentActions);
  const corpus = dataCorpus({
    exposures: data.exposures.length,
    threats: data.threats.length,
    mentions: mod.mentions.length,
    incidents: mod.incidents.length,
    credentialLeaks: mod.credentialLeaks.length,
    domainRisks: mod.domainRisks.length,
    sources: topExposureSources(data.exposures, 50).length,
  });

  const ltvHealthy = ue.ltvToCac >= 3;
  const nrrHealthy = ret.nrr >= 100;
  // SaaS magic number: annualized net-new MRR over the S&M (acquisition) spend
  // carried by logos won this month.
  const recentSpend = accounts
    .filter((a) => Date.now() - new Date(a.startedAt).getTime() <= 30 * 86_400_000)
    .reduce((s, a) => s + a.acquisitionCost, 0);
  const magic = magicNumber(movement.netNewMrr * 12, recentSpend);

  // Composite business health — blends growth, retention, efficiency,
  // defensibility, compliance and enterprise mix into one board-ready score.
  const compliance = readiness();
  const playbooks = summarizeRuns(
    runPlaybooks([...data.exposures.map(exposureToFinding), ...data.threats.map(threatToFinding)]),
  );
  const health = businessHealth({
    nrr: ret.nrr,
    netNewMrr: movement.netNewMrr,
    ltvToCac: ue.ltvToCac,
    paybackMonths: ue.paybackMonths,
    detectionAccuracy: accuracy,
    automationRate: playbooks.automationRate,
    compliance: compliance.readiness,
    enterpriseShare: ent.mrrShare,
  });
  const gradeColor =
    health.grade === "A" ? "text-risk-low" : health.grade === "B" ? "text-risk-low" : health.grade === "C" ? "text-risk-medium" : "text-risk-high";

  // A simple synthetic ARR ramp for the headline chart (deterministic from current ARR).
  const arrRamp = [0.42, 0.5, 0.57, 0.63, 0.71, 0.78, 0.85, 0.91, 0.96, 1].map((f) => Math.round(annual * f));

  return (
    <div className="space-y-4">
      <PageHeader
        icon={TrendingUp}
        title="Growth & Revenue"
        subtitle="Operator console — the SaaS, retention, unit-economics and defensibility metrics behind PrivacyOS."
        actions={
          <span className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1",
            live ? "bg-risk-low/10 text-risk-low ring-risk-low/30" : "bg-risk-medium/10 text-risk-medium ring-risk-medium/30",
          )}>
            {live ? "Live billing data" : "Modeled book of business"}
          </span>
        }
      />

      {/* Executive health band — board-ready composite */}
      <Card className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4 sm:border-r sm:border-border sm:pr-6">
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
              <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#1f2430" strokeWidth="10" />
                <circle
                  cx="60" cy="60" r="50" fill="none" strokeWidth="10" strokeLinecap="round"
                  stroke={health.grade === "A" || health.grade === "B" ? "#22c55e" : health.grade === "C" ? "#eab308" : "#ef4444"}
                  strokeDasharray={`${(health.score / 100) * 2 * Math.PI * 50} ${2 * Math.PI * 50}`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={cn("text-2xl font-bold", gradeColor)}>{health.grade}</span>
                <span className="text-[10px] text-slate-400">{health.score}/100</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Business health</p>
              <p className="text-lg font-bold text-white">Enterprise-infrastructure grade</p>
              <p className="text-xs text-slate-500">Growth · retention · efficiency · moat · compliance · enterprise mix</p>
            </div>
          </div>
          <div className="grid flex-1 grid-cols-3 gap-2.5 sm:grid-cols-6">
            {health.dimensions.map((d) => (
              <div key={d.key} className="rounded-lg border border-border bg-bg-subtle/50 p-2.5 text-center">
                <p className={cn("text-lg font-bold", d.score >= 70 ? "text-risk-low" : d.score >= 50 ? "text-risk-medium" : "text-risk-high")}>
                  {d.score}
                </p>
                <p className="mt-0.5 text-[10px] text-slate-400">{d.label}</p>
                <p className="text-[9px] text-slate-600">{d.verdict}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Headline metrics investors underwrite */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Monthly recurring</span>
            <DollarSign className="h-4 w-4 text-brand-fg" />
          </div>
          <p className="mt-1 text-2xl font-bold text-white">{money(monthly)}</p>
          <p className={cn("text-[11px] font-semibold", movement.netNewMrr >= 0 ? "text-risk-low" : "text-risk-high")}>
            {movement.netNewMrr >= 0 ? "+" : ""}{money(movement.netNewMrr)} net new / mo
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Annual recurring</span>
            <TrendingUp className="h-4 w-4 text-risk-low" />
          </div>
          <p className="mt-1 text-2xl font-bold text-white">{money(annual)}</p>
          <p className="text-[11px] text-slate-500">{activeLogos(accounts)} logos · ARPU {money(arpuVal)}/mo</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Net revenue retention</span>
            <Repeat className={cn("h-4 w-4", nrrHealthy ? "text-risk-low" : "text-risk-high")} />
          </div>
          <p className={cn("mt-1 text-2xl font-bold", nrrHealthy ? "text-risk-low" : "text-white")}>{ret.nrr}%</p>
          <p className="text-[11px] text-slate-500">GRR {ret.grr}% · churn {ret.logoChurn}%</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">LTV : CAC</span>
            <Gauge className={cn("h-4 w-4", ltvHealthy ? "text-risk-low" : "text-risk-medium")} />
          </div>
          <p className={cn("mt-1 text-2xl font-bold", ltvHealthy ? "text-risk-low" : "text-white")}>{ue.ltvToCac.toFixed(1)}×</p>
          <p className="text-[11px] text-slate-500">payback {ue.paybackMonths.toFixed(1)} mo</p>
        </Card>
      </div>

      {/* ARR ramp + MRR movement */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <SectionTitle
            title="ARR trajectory"
            subtitle="Recurring revenue compounding across all four product lines"
            action={<span className="text-xs font-semibold text-risk-low">{money(annual)} ARR</span>}
          />
          <AreaChart values={arrRamp} height={150} color="#22c55e" />
        </Card>
        <Card className="p-4">
          <SectionTitle title="MRR movement" subtitle="This month" />
          <ul className="space-y-2.5">
            <MovementRow label="New business" value={movement.newMrr} positive />
            <MovementRow label="Expansion" value={movement.expansionMrr} positive />
            <MovementRow label="Churn" value={-movement.churnedMrr} />
            <li className="flex items-center justify-between border-t border-border pt-2.5">
              <span className="text-sm font-semibold text-white">Net new MRR</span>
              <span className={cn("text-sm font-bold", movement.netNewMrr >= 0 ? "text-risk-low" : "text-risk-high")}>
                {movement.netNewMrr >= 0 ? "+" : ""}{money(movement.netNewMrr)}
              </span>
            </li>
          </ul>
        </Card>
      </div>

      {/* Revenue by product line + enterprise book */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <SectionTitle title="Revenue by product line" subtitle="PrivacyOS · ReputationOS · ExecutiveOS · BusinessOS · AI Agents" />
          <ul className="space-y-2.5">
            {revByCat.map((r) => {
              const Icon = CATEGORY_ICON[r.category];
              const max = Math.max(...revByCat.map((x) => x.mrr), 1);
              return (
                <li key={r.category} className="flex items-center gap-3">
                  <span className="flex w-36 shrink-0 items-center gap-2 text-xs text-slate-300">
                    <Icon className="h-3.5 w-3.5 text-brand-fg" />
                    <span className="truncate">{r.label}</span>
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg-subtle">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${(r.mrr / max) * 100}%` }} />
                  </div>
                  <span className="w-16 shrink-0 text-right text-xs font-semibold text-white">{money(r.mrr)}</span>
                  <span className="w-12 shrink-0 text-right text-[11px] text-slate-500">{r.logos} logos</span>
                </li>
              );
            })}
          </ul>
        </Card>
        <Card className="p-4">
          <SectionTitle title="Enterprise book" subtitle="Annual contracts" />
          <div className="grid grid-cols-2 gap-2.5">
            <Mini label="Contracts" value={`${ent.contracts}`} />
            <Mini label="Total ACV" value={money(ent.acv)} accent="text-risk-low" />
            <Mini label="Avg ACV" value={money(ent.averageAcv)} />
            <Mini label="of MRR" value={`${ent.mrrShare}%`} accent="text-brand-fg" />
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
            Sticky, multi-year revenue is the hardest to displace — and what drives enterprise-infrastructure valuations.
          </p>
        </Card>
      </div>

      {/* Defensibility: detection accuracy (computed from real scoring) */}
      <Card className="p-4">
        <SectionTitle
          title="Detection accuracy"
          subtitle="Confidence scored by the live detection algorithms over your footprint"
          action={<span className="text-sm font-bold text-risk-low">{accuracy}% blended</span>}
        />
        {detectors.length > 0 ? (
          <div className="grid grid-cols-1 gap-x-8 gap-y-2.5 md:grid-cols-2">
            {detectors.map((d) => (
              <div key={d.detector} className="flex items-center gap-3">
                <span className="w-40 shrink-0 truncate text-xs text-slate-300">{d.label}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-subtle">
                  <div
                    className={cn("h-full rounded-full", d.accuracy >= 90 ? "bg-risk-low" : d.accuracy >= 75 ? "bg-risk-medium" : "bg-risk-high")}
                    style={{ width: `${d.accuracy}%` }}
                  />
                </div>
                <span className="w-12 shrink-0 text-right text-xs font-semibold text-white">{d.accuracy}%</span>
                <span className="hidden w-20 shrink-0 text-right text-[10px] text-slate-500 sm:block">
                  {d.evaluated} scored
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No items to score yet — detectors activate as findings arrive.</p>
        )}
      </Card>

      {/* Automation moat + proprietary data corpus */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card className="p-4">
          <SectionTitle title="Automation moat" subtitle="Work the agents do without a human" />
          <div className="flex items-center gap-5">
            <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
              <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#1f2430" strokeWidth="12" />
                <circle
                  cx="60" cy="60" r="50" fill="none" stroke="#6366f1" strokeWidth="12" strokeLinecap="round"
                  strokeDasharray={`${(moat.automationRate / 100) * 2 * Math.PI * 50} ${2 * Math.PI * 50}`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-white">{moat.automationRate}%</span>
                <span className="text-[10px] text-slate-400">autonomous</span>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <Row icon={<Bot className="h-4 w-4 text-brand-fg" />} label="Autonomous actions" value={`${moat.autonomousActions}`} />
              <Row icon={<Users className="h-4 w-4 text-slate-400" />} label="Human-in-loop" value={`${moat.humanActions}`} />
              <Row icon={<Gauge className="h-4 w-4 text-risk-low" />} label="Analyst-hours saved / yr" value={moat.hoursSaved.toLocaleString()} />
              <Row icon={<DollarSign className="h-4 w-4 text-risk-low" />} label="Labor value / yr" value={money(moat.laborValue)} />
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <SectionTitle title="Proprietary intelligence corpus" subtitle="The data advantage that compounds" />
          <div className="grid grid-cols-2 gap-2.5">
            <Mini label="Records under mgmt" value={corpus.records.toLocaleString()} accent="text-brand-fg" />
            <Mini label="Signal types" value={`${corpus.signalTypes}`} />
            <Mini label="Daily velocity" value={`+${corpus.dailyVelocity}/day`} accent="text-risk-low" />
            <Mini label="Source categories" value={`${corpus.sources}`} />
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-bg-subtle/50 p-2.5">
            <Database className="h-4 w-4 shrink-0 text-brand-fg" />
            <p className="text-[11px] leading-relaxed text-slate-400">
              Every scan enriches a corpus competitors can&apos;t replicate — the flywheel behind detection accuracy and the automation moat.
            </p>
          </div>
        </Card>
      </div>

      {/* Investor scorecard */}
      <Card className="p-4">
        <SectionTitle title="Investor scorecard" subtitle="The metrics that define enterprise-infrastructure value" />
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-3">
          <Scorecard label="MRR" value={money(monthly)} good={movement.netNewMrr >= 0} note="growing" />
          <Scorecard label="NRR" value={`${ret.nrr}%`} good={nrrHealthy} note={nrrHealthy ? "expansion > churn" : "watch churn"} />
          <Scorecard label="LTV:CAC" value={`${ue.ltvToCac.toFixed(1)}×`} good={ltvHealthy} note={ltvHealthy ? "efficient" : "improving"} />
          <Scorecard label="CAC payback" value={`${ue.paybackMonths.toFixed(1)} mo`} good={ue.paybackMonths <= 12} note="months" />
          <Scorecard label="Magic number" value={magic.toFixed(1)} good={magic >= 0.75} note="net-new ARR / S&M" />
          <Scorecard label="Enterprise ACV" value={money(ent.acv)} good note={`${ent.contracts} contracts`} />
          <Scorecard label="Detection acc." value={`${accuracy}%`} good={accuracy >= 90} note="live scored" />
          <Scorecard label="Automation" value={`${moat.automationRate}%`} good={moat.automationRate >= 75} note="autonomous" />
          <Scorecard label="Gross margin" value={`${Math.round(ue.grossMargin * 100)}%`} good note="software" />
        </div>
        <Link href="/pricing" className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-brand-fg hover:underline">
          View the full plan catalog <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Card>
    </div>
  );
}

/* ── Local helpers ───────────────────────────────────────────────────────── */

function MovementRow({ label, value, positive }: { label: string; value: number; positive?: boolean }) {
  const isNeg = value < 0;
  return (
    <li className="flex items-center justify-between">
      <span className="text-sm text-slate-400">{label}</span>
      <span className={cn("inline-flex items-center gap-1 text-sm font-semibold", isNeg ? "text-risk-high" : positive ? "text-risk-low" : "text-white")}>
        {isNeg ? <TrendingDown className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}
        {isNeg ? "-" : "+"}{money(Math.abs(value))}
      </span>
    </li>
  );
}

function Mini({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg-subtle/60 p-2.5">
      <p className={cn("text-lg font-bold text-white", accent)}>{value}</p>
      <p className="mt-0.5 text-[10px] text-slate-500">{label}</p>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-slate-400">{label}</span>
      <span className="ml-auto font-semibold text-white">{value}</span>
    </div>
  );
}

function Scorecard({ label, value, good, note }: { label: string; value: string; good?: boolean; note: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg-subtle/50 p-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wide text-slate-400">{label}</span>
        <span className={cn("h-1.5 w-1.5 rounded-full", good ? "bg-risk-low" : "bg-risk-medium")} />
      </div>
      <p className="mt-1 text-xl font-bold text-white">{value}</p>
      <p className="text-[10px] text-slate-500">{note}</p>
    </div>
  );
}
