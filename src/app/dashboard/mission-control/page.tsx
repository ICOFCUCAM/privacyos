import Link from "next/link";
import {
  ShieldAlert, FolderKanban, GitBranch, Bot, Activity,
  ArrowRight, AlertTriangle, CheckCircle2, Gauge,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, PageHeader, SectionTitle } from "@/components/ui";
import { getDataSource } from "@/lib/data";
import { exposureToFinding, runPlaybooks, threatToFinding } from "@/lib/agents/playbooks";
import { buildWorkflows, workflowMetrics } from "@/lib/agents/workflows";
import { caseQueue, summarizeCases } from "@/lib/intelligence/case-intel";
import { summarizeThreats } from "@/lib/intelligence/threat-intel";
import { listWorkflowDefinitions } from "@/lib/agents/workflow-store";
import { getModuleData } from "@/lib/data/modules";
import { executiveRiskIndices } from "@/lib/executive/os/risk-indices";
import { analyzeAttackSurface } from "@/lib/executive/os/attack-paths";
import { sharedExposures, memberRisks, familyOverview, childSafety } from "@/lib/family/os/family-os";
import { protectionSuite, summarizeSuite, type SuiteBand } from "@/lib/suite/protection-suite";
import { synthesizeRecommendations } from "@/lib/agents/synthesis";
import { assessTrips } from "@/lib/intelligence/travel-risk";
import { travelOverview, destinationIntel } from "@/lib/travel/os/travel-os";
import { RISK_INDEX_META, type ExecutiveRiskIndices } from "@/lib/executive/os/risk-indices";
import {
  buildPriorityQueue, computePosture, countUnresolvedExposures,
  type ActionKind, type ActionUrgency, type PostureLevel,
} from "@/lib/intelligence/mission-control";
import { cn, titleCase } from "@/lib/ui";
import type { RiskLevel } from "@/lib/types";
import { Crown, Target, LayoutGrid, Sparkles, Siren, Users, Plane, Scale } from "lucide-react";

const RISK_CLS: Record<RiskLevel, string> = {
  low: "text-risk-low ring-risk-low/30",
  medium: "text-risk-medium ring-risk-medium/30",
  high: "text-risk-high ring-risk-high/30",
  critical: "text-risk-critical ring-risk-critical/30",
};
const RISK_RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };

export const metadata = { title: "Mission Control" };

const SUITE_BAND: Record<SuiteBand, string> = {
  low: "text-risk-low ring-risk-low/30",
  elevated: "text-risk-medium ring-risk-medium/30",
  high: "text-risk-high ring-risk-high/30",
  critical: "text-risk-critical ring-risk-critical/30",
};

const POSTURE: Record<PostureLevel, { ring: string; bg: string; text: string; dot: string; icon: LucideIcon }> = {
  operational: { ring: "ring-risk-low/30", bg: "bg-risk-low/10", text: "text-risk-low", dot: "bg-risk-low", icon: CheckCircle2 },
  elevated: { ring: "ring-risk-medium/30", bg: "bg-risk-medium/10", text: "text-risk-medium", dot: "bg-risk-medium", icon: Activity },
  critical: { ring: "ring-risk-high/30", bg: "bg-risk-high/10", text: "text-risk-high", dot: "bg-risk-high", icon: AlertTriangle },
};

const URGENCY: Record<ActionUrgency, string> = {
  critical: "text-risk-critical bg-risk-critical/10 ring-risk-critical/30",
  high: "text-risk-high bg-risk-high/10 ring-risk-high/30",
  medium: "text-risk-medium bg-risk-medium/10 ring-risk-medium/30",
};

const KIND_ICON: Record<ActionKind, LucideIcon> = {
  case: FolderKanban, workflow: GitBranch, threat: ShieldAlert,
};

export default async function MissionControlPage() {
  const ds = await getDataSource();
  const data = await ds.getDataset();

  const runs = runPlaybooks([
    ...data.exposures.map(exposureToFinding),
    ...data.threats.map(threatToFinding),
  ]);
  const workflows = buildWorkflows(runs);
  const wfMetrics = workflowMetrics(workflows);
  const caseSummary = summarizeCases(data.cases, data.exposures);
  const cases = caseQueue(data.cases, data.exposures);
  const threatSummary = summarizeThreats(data.threats);
  const definitions = await listWorkflowDefinitions();
  const enabledAutomations = definitions.filter((d) => d.enabled).length;
  const unresolvedExposures = countUnresolvedExposures(data.exposures.map((e) => e.status));
  const mod = await getModuleData();
  const { familyMembers, travelAlerts, credentialLeaks } = mod;
  const suite = protectionSuite({
    exposures: data.exposures, threats: data.threats, mentions: mod.mentions, familyMembers, travelAlerts,
    credentialLeaks, domainRisks: mod.domainRisks, employeeExposures: mod.employeeExposures,
    thirdPartyRisks: mod.thirdPartyRisks, subjectEmails: data.subject.emails,
  });
  const suiteSummary = summarizeSuite(suite);
  const execRisk = executiveRiskIndices({ exposures: data.exposures, threats: data.threats, family: familyMembers, travel: travelAlerts, credentialLeaks });
  const surface = analyzeAttackSurface({ exposures: data.exposures, threats: data.threats, credentialLeaks });
  const famRisks = memberRisks(familyMembers, sharedExposures(data.exposures));
  const childSafetyAlerts = famRisks.filter((r) => r.member.isMinor && r.total >= 50).length;

  // ── Per-domain rollups for the single-screen command grid ──────────────────
  const activeThreats = [...data.threats].filter((t) => !t.acknowledged).sort((a, b) => RISK_RANK[b.riskLevel] - RISK_RANK[a.riskLevel]);
  const openCases = [...data.cases].filter((c) => c.status !== "resolved").sort((a, b) => RISK_RANK[b.riskLevel] - RISK_RANK[a.riskLevel]);
  const topAgents = [...data.agents].sort((a, b) => b.itemsHandled - a.itemsHandled);
  const recs = [...data.recommendations].sort((a, b) => b.impact - a.impact);
  const recSynthesis = synthesizeRecommendations(data.recommendations);
  const openIncidents = mod.incidents.filter((i) => i.status !== "resolved" && i.status !== "dismissed").sort((a, b) => RISK_RANK[b.riskLevel] - RISK_RANK[a.riskLevel]);
  const execWorst = RISK_INDEX_META
    .map((m) => ({ label: m.label, value: execRisk[m.key as keyof ExecutiveRiskIndices] as number }))
    .sort((a, b) => b.value - a.value);
  const fam = familyOverview(familyMembers, data.exposures);
  const famSafety = childSafety(famRisks);
  const trips = assessTrips(travelAlerts, data.exposures, data.threats);
  const travel = travelOverview(trips);
  const destinations = destinationIntel(trips);
  const legalOpen = mod.legalRequests.filter((l) => l.status !== "completed");
  const legalEscalated = mod.legalRequests.filter((l) => l.status === "escalated").length;

  const posture = computePosture({
    riskScore: data.riskScore.overall,
    agents: data.agents,
    workflows: wfMetrics,
    cases: caseSummary,
    threats: threatSummary,
    unresolvedExposures,
    enabledAutomations,
    executiveRisk: execRisk.overall,
    attackPaths: surface.enabledPaths,
    topAttackScore: surface.topScore,
    childSafetyAlerts,
  });
  const queue = buildPriorityQueue(cases, workflows, data.threats);

  const P = POSTURE[posture.level];
  const PIcon = P.icon;

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Gauge}
        title="Mission Control"
        subtitle="The single operating picture — fleet, workflows, cases and threats in one command view, with the queue of what needs a human right now."
        actions={
          <span className={cn("inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ring-1", P.bg, P.text, P.ring)}>
            <span className={cn("h-2 w-2 rounded-full", P.dot)} />
            {titleCase(posture.level)}
          </span>
        }
      />

      {/* Posture banner */}
      <div className={cn("flex flex-wrap items-center gap-3 rounded-xl border border-border px-4 py-3 ring-1", P.bg, P.ring)}>
        <PIcon className={cn("h-5 w-5 shrink-0", P.text)} />
        <div className="min-w-0 flex-1">
          <p className={cn("text-sm font-semibold", P.text)}>{posture.headline}</p>
          <p className="mt-0.5 text-xs text-slate-400">{posture.drivers.join(" · ")}</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Bot className="h-3.5 w-3.5" />
          {posture.agentsActive}/{posture.agentsTotal} agents engaged
        </div>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Metric label="Risk score" value={String(posture.riskScore)} tone={posture.riskScore >= 80 ? "text-risk-high" : posture.riskScore >= 55 ? "text-risk-medium" : "text-risk-low"} icon={Gauge} href="/dashboard" />
        <Metric label="Executive risk" value={String(execRisk.overall)} sub={`${titleCase(execRisk.band)} · ${posture.executiveRisk >= 75 ? "action now" : "principal"}`} tone={execRisk.overall >= 75 ? "text-risk-critical" : execRisk.overall >= 50 ? "text-risk-high" : execRisk.overall >= 25 ? "text-risk-medium" : "text-risk-low"} icon={Crown} href="/dashboard/executive" />
        <Metric label="Attack paths" value={String(surface.enabledPaths)} sub={surface.chokepoint ? `top score ${surface.topScore}` : "none live"} tone={surface.topScore >= 70 ? "text-risk-critical" : surface.enabledPaths > 0 ? "text-risk-high" : "text-risk-low"} icon={Target} href="/dashboard/executive/attack-paths" />
        <Metric label="Open cases" value={String(caseSummary.open)} sub={caseSummary.slaBreached > 0 ? `${caseSummary.slaBreached} SLA breached` : `${caseSummary.critical} critical`} tone="text-white" icon={FolderKanban} href="/dashboard/cases" />
        <Metric label="Active workflows" value={String(wfMetrics.active)} sub={wfMetrics.awaitingApproval > 0 ? `${wfMetrics.awaitingApproval} awaiting approval` : "fully autonomous"} tone="text-white" icon={GitBranch} href="/dashboard/workflows" />
        <Metric label="Active threats" value={String(threatSummary.active)} sub={`${threatSummary.bySeverity.critical} critical · ${threatSummary.bySeverity.high} high`} tone="text-white" icon={ShieldAlert} href="/dashboard/threats" />
      </div>

      {/* Cross-domain protection posture (Protection Suite) */}
      <Link href="/dashboard/suite" className="block">
        <Card className="p-3 transition hover:border-brand/30">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-white">
              <LayoutGrid className="h-3.5 w-3.5 text-brand-fg" /> Protection Suite
            </span>
            <span className="text-[11px] text-slate-500">{suiteSummary.atRisk} of {suiteSummary.domains} domains at risk</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {suite.map((d) => (
                <span key={d.key} className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1", SUITE_BAND[d.band])}>
                  {d.label} {d.score}
                </span>
              ))}
            </div>
            <ArrowRight className="ml-auto h-3.5 w-3.5 text-slate-500" />
          </div>
        </Card>
      </Link>

      {/* Priority action queue */}
      <Card className="p-4">
          <SectionTitle
            title="Priority action queue"
            subtitle="Everything needing a human, ranked across cases, workflows and threats"
            action={<span className="text-xs text-slate-500">{queue.length} item{queue.length === 1 ? "" : "s"}</span>}
          />
          {queue.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-risk-low/30 bg-risk-low/10 px-3.5 py-3 text-sm text-risk-low">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Queue clear — the fleet is handling everything autonomously.
            </div>
          ) : (
            <ul className="space-y-2">
              {queue.map((a) => {
                const Icon = KIND_ICON[a.kind];
                return (
                  <li key={a.id}>
                    <Link href={a.href} className="flex items-center gap-3 rounded-xl border border-border bg-bg-subtle/40 p-3 transition hover:border-brand/30 hover:bg-bg-subtle/70">
                      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1", URGENCY[a.urgency])}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">{a.title}</p>
                        <p className="text-[11px] text-slate-500">{titleCase(a.kind)} · {a.detail}</p>
                      </div>
                      <span className={cn("shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1", URGENCY[a.urgency])}>
                        {a.urgency}
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-600" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
      </Card>

      {/* Operational command — every domain on one screen */}
      <div className="flex items-center justify-between pt-1">
        <h2 className="text-sm font-semibold text-white">Operational command</h2>
        <span className="text-[11px] text-slate-500">{enabledAutomations} automations on · {posture.itemsHandled.toLocaleString()} items handled · {wfMetrics.hoursSaved}h saved</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <DomainPanel icon={ShieldAlert} title="Threats" href="/dashboard/threats" headline={String(threatSummary.active)} headlineTone={threatSummary.bySeverity.critical > 0 ? "text-risk-critical" : threatSummary.active > 0 ? "text-risk-high" : "text-risk-low"} sub={`${threatSummary.bySeverity.critical} critical · ${threatSummary.bySeverity.high} high`} items={activeThreats.slice(0, 3).map((t) => ({ label: t.title, badge: t.riskLevel, badgeCls: RISK_CLS[t.riskLevel] }))} empty="No active threats" />
        <DomainPanel icon={FolderKanban} title="Cases" href="/dashboard/cases" headline={String(caseSummary.open)} headlineTone={caseSummary.slaBreached > 0 ? "text-risk-high" : "text-white"} sub={caseSummary.slaBreached > 0 ? `${caseSummary.slaBreached} SLA breached` : `${caseSummary.critical} critical`} items={openCases.slice(0, 3).map((c) => ({ label: c.title, badge: c.riskLevel, badgeCls: RISK_CLS[c.riskLevel] }))} empty="No open cases" />
        <DomainPanel icon={Bot} title="Agents" href="/dashboard/agents" headline={`${posture.agentsActive}/${posture.agentsTotal}`} headlineTone="text-white" sub={`${posture.itemsHandled.toLocaleString()} items handled`} items={topAgents.slice(0, 3).map((a) => ({ label: a.name, badge: a.status === "running" ? "live" : a.status, badgeCls: a.status === "running" ? "text-risk-low ring-risk-low/30" : "text-slate-400 ring-border" }))} empty="No agents" />
        <DomainPanel icon={Sparkles} title="Recommendations" href="/dashboard/recommendations" headline={String(recs.length)} headlineTone={recs.length > 0 ? "text-risk-medium" : "text-risk-low"} sub={`${recSynthesis.projectedImpact} pts projected`} items={recs.slice(0, 3).map((r) => ({ label: r.title, badge: r.riskLevel, badgeCls: RISK_CLS[r.riskLevel] }))} empty="No recommendations" />
        <DomainPanel icon={GitBranch} title="Workflows" href="/dashboard/workflows" headline={String(wfMetrics.active)} headlineTone={wfMetrics.escalated > 0 ? "text-risk-high" : "text-white"} sub={wfMetrics.awaitingApproval > 0 ? `${wfMetrics.awaitingApproval} awaiting approval` : `${wfMetrics.escalated} escalated`} items={workflows.slice(0, 3).map((w) => ({ label: w.name, badge: w.status, badgeCls: w.status === "escalated" ? "text-risk-high ring-risk-high/30" : w.blocked ? "text-risk-medium ring-risk-medium/30" : "text-risk-low ring-risk-low/30" }))} empty="No workflows" />
        <DomainPanel icon={Siren} title="Incidents" href="/dashboard/incidents" headline={String(openIncidents.length)} headlineTone={openIncidents.some((i) => i.riskLevel === "critical") ? "text-risk-critical" : openIncidents.length > 0 ? "text-risk-high" : "text-risk-low"} sub={`${openIncidents.length} open`} items={openIncidents.slice(0, 3).map((i) => ({ label: i.title, badge: i.riskLevel, badgeCls: RISK_CLS[i.riskLevel] }))} empty="No open incidents" />
        <DomainPanel icon={Crown} title="Executive risks" href="/dashboard/executive" headline={String(execRisk.overall)} headlineTone={domainTone(execRisk.overall)} sub={`${titleCase(execRisk.band)} risk`} items={execWorst.slice(0, 3).map((e) => ({ label: e.label, badge: String(e.value), badgeCls: RISK_CLS[domainBand(e.value)] }))} empty="Low risk" />
        <DomainPanel icon={Users} title="Family risks" href="/dashboard/family" headline={String(fam.familyRisk)} headlineTone={domainTone(fam.familyRisk)} sub={`${fam.minors} minor(s) · ${famSafety.alerts.length} alert(s)`} items={famRisks.slice(0, 3).map((r) => ({ label: r.member.displayName, badge: String(r.total), badgeCls: RISK_CLS[r.band] }))} empty="No family on file" />
        <DomainPanel icon={Plane} title="Travel risks" href="/dashboard/travel" headline={titleCase(travel.highestPosture)} headlineTone={travel.highestPosture === "high" ? "text-risk-critical" : travel.highestPosture === "elevated" ? "text-risk-high" : travel.highestPosture === "guarded" ? "text-risk-medium" : "text-risk-low"} sub={`${travel.upcoming} upcoming · ${travel.destinations} dest.`} items={destinations.slice(0, 3).map((d) => ({ label: d.destination, badge: titleCase(d.posture) }))} empty="No trips" />
        <DomainPanel icon={Scale} title="Compliance" href="/dashboard/compliance" headline={String(legalOpen.length)} headlineTone={legalEscalated > 0 ? "text-risk-high" : "text-white"} sub={legalEscalated > 0 ? `${legalEscalated} escalated` : `${mod.legalRequests.length} requests`} items={legalOpen.slice(0, 3).map((l) => ({ label: `${titleCase(l.type)} → ${l.recipient}`, badge: titleCase(l.status) }))} empty="All requests complete" />
      </div>
    </div>
  );
}

function domainTone(n: number): string {
  return n >= 75 ? "text-risk-critical" : n >= 50 ? "text-risk-high" : n >= 25 ? "text-risk-medium" : "text-risk-low";
}
function domainBand(n: number): RiskLevel {
  return n >= 75 ? "critical" : n >= 50 ? "high" : n >= 25 ? "medium" : "low";
}

function DomainPanel({ icon: Icon, title, href, headline, headlineTone, sub, items, empty }: {
  icon: LucideIcon; title: string; href: string; headline: string; headlineTone?: string; sub?: string;
  items: { label: string; badge?: string; badgeCls?: string }[]; empty: string;
}) {
  return (
    <Card className="flex flex-col p-3.5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-white"><Icon className="h-3.5 w-3.5 text-brand-fg" /> {title}</span>
        <Link href={href} className="text-[10px] font-medium text-brand-fg hover:underline">Open</Link>
      </div>
      <p className={cn("mt-1 text-2xl font-bold leading-none", headlineTone)}>{headline}</p>
      {sub && <p className="mt-0.5 text-[10px] text-slate-500">{sub}</p>}
      <ul className="mt-2 space-y-1 border-t border-border pt-2">
        {items.length ? items.map((it, i) => (
          <li key={i} className="flex items-center justify-between gap-1.5 text-[11px]">
            <span className="min-w-0 truncate text-slate-300">{it.label}</span>
            {it.badge && <span className={cn("shrink-0 rounded px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide ring-1", it.badgeCls ?? "text-slate-400 ring-border")}>{it.badge}</span>}
          </li>
        )) : <li className="text-[10px] text-slate-500">{empty}</li>}
      </ul>
    </Card>
  );
}

function Metric({
  label, value, sub, tone, icon: Icon, href,
}: {
  label: string; value: string; sub?: string; tone?: string; icon: LucideIcon; href: string;
}) {
  return (
    <Link href={href}>
      <Card className="p-4 transition hover:border-brand/30">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</span>
          <Icon className="h-3.5 w-3.5 text-slate-500" />
        </div>
        <p className={cn("mt-1 text-2xl font-bold", tone)}>{value}</p>
        {sub && <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p>}
      </Card>
    </Link>
  );
}

