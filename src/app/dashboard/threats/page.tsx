import Link from "next/link";
import {
  ShieldAlert, KeyRound, Eye, ScanFace, UserX, MapPin, Megaphone, Search, Brain,
  Zap, ArrowUpRight, Scale, Crown, Star, ShieldCheck, CheckCircle2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { buttonClasses, Card, PageHeader, RiskBadge } from "@/components/ui";
import { getDataSource } from "@/lib/data";
import {
  groupThreats, investigationTimeline, summarizeThreats, threatIntel, THREAT_CATEGORIES,
} from "@/lib/intelligence/threat-intel";
import { getThreatInvestigations } from "@/lib/intelligence/investigation-store";
import { cn, timeAgo, titleCase } from "@/lib/ui";
import type { AgentKind, RiskLevel, ThreatKind } from "@/lib/types";
import { acknowledgeThreatAction } from "@/app/dashboard/actions";

export const metadata = { title: "Threat Feed" };

const KIND_ICON: Record<ThreatKind, LucideIcon> = {
  credential_leak: KeyRound,
  dark_web_mention: Eye,
  deepfake: ScanFace,
  impersonation: UserX,
  doxxing: MapPin,
  location_exposure: MapPin,
  negative_press: Megaphone,
};

const AGENT_ICON: Record<AgentKind | "user", LucideIcon> = {
  discovery: Search, threat_intel: Brain, security: ShieldCheck, incident: Zap,
  legal: Scale, deepfake: ScanFace, executive: Crown, reputation: Star,
  privacy: ShieldCheck, business: ShieldCheck, orchestrator: Brain, compliance: Scale, vendor: ShieldCheck,
  user: CheckCircle2,
};

const SEV_TEXT: Record<RiskLevel, string> = {
  critical: "text-risk-critical", high: "text-risk-high", medium: "text-risk-medium", low: "text-risk-low",
};

export default async function ThreatsPage() {
  const ds = await getDataSource();
  const { threats } = await ds.getDataset();

  const summary = summarizeThreats(threats);
  const groups = groupThreats(threats);
  // Real, persisted investigation steps per threat (live); empty in demo.
  const investigations = await getThreatInvestigations();

  return (
    <div className="space-y-5">
      <PageHeader
        icon={ShieldAlert}
        title="Threat Intelligence"
        subtitle="Investigations, not just alerts — correlated, scored and worked by the agent fleet."
      />

      {/* Threat overview */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Card className="p-4">
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Active threats</span>
          <p className="mt-1 text-2xl font-bold text-white">{summary.active}</p>
          <p className="text-[11px] text-slate-500">{summary.total} total tracked</p>
        </Card>
        <Card className="p-4">
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">By severity</span>
          <div className="mt-1 flex items-baseline gap-2 text-lg font-bold">
            <span className="text-risk-critical">{summary.bySeverity.critical}</span>
            <span className="text-risk-high">{summary.bySeverity.high}</span>
            <span className="text-risk-medium">{summary.bySeverity.medium}</span>
            <span className="text-risk-low">{summary.bySeverity.low}</span>
          </div>
          <p className="text-[11px] text-slate-500">crit · high · med · low</p>
        </Card>
        <Card className="p-4">
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Latest discovery</span>
          <p className="mt-1 truncate text-sm font-bold text-white">{summary.latest ? THREAT_CATEGORIES[summary.latest.kind] : "—"}</p>
          <p className="text-[11px] text-slate-500">{summary.latest ? timeAgo(summary.latest.detectedAt) : "nothing active"}</p>
        </Card>
        <Card className="p-4">
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Highest risk</span>
          <p className="mt-1 truncate text-sm font-bold text-white">{summary.highest?.title ?? "—"}</p>
          <p className={cn("text-[11px] font-semibold", summary.highest ? SEV_TEXT[summary.highest.riskLevel] : "text-slate-500")}>
            {summary.highest ? titleCase(summary.highest.riskLevel) : "clear"}
          </p>
        </Card>
        <Card className="p-4">
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Agents working</span>
          <p className="mt-1 text-2xl font-bold text-risk-low">{summary.agentsWorking}</p>
          <p className="text-[11px] text-slate-500">on active investigations</p>
        </Card>
      </div>

      {summary.total === 0 ? (
        <Card className="text-center text-sm text-slate-500">No threats detected — the fleet is monitoring continuously.</Card>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => {
            const GIcon = KIND_ICON[group.kind] ?? ShieldAlert;
            return (
              <div key={group.kind} className="space-y-3">
                {/* Category header */}
                <div className="flex items-center gap-2.5">
                  <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg ring-1", `bg-risk-${group.topSeverity}/10 ring-risk-${group.topSeverity}/30`)}>
                    <GIcon className={cn("h-4 w-4", SEV_TEXT[group.topSeverity])} />
                  </span>
                  <h2 className="text-sm font-semibold text-white">{group.label}</h2>
                  <span className="rounded-full bg-bg-subtle px-2 py-0.5 text-[11px] font-semibold text-slate-300 ring-1 ring-border">{group.count}</span>
                </div>

                {group.threats.map((t) => {
                  const intel = threatIntel(t);
                  const stored = investigations.get(t.id);
                  // Prefer the real persisted trail; fall back to the derived one.
                  const timeline = stored?.length
                    ? stored.map((s) => ({ agent: s.agent as never, label: s.label, at: s.at }))
                    : investigationTimeline(t).map((s) => ({ ...s, at: undefined as string | undefined }));
                  const isReal = !!stored?.length;
                  return (
                    <Card key={t.id} className="space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <RiskBadge level={t.riskLevel} />
                            <p className="font-semibold text-white">{t.title}</p>
                            {!t.acknowledged && (
                              <span className="rounded bg-risk-critical/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-risk-critical">New</span>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-slate-400">{t.detail}</p>
                        </div>
                        {/* Intelligence score */}
                        <div className="flex shrink-0 items-center gap-4 rounded-lg border border-border bg-bg-subtle/40 px-3 py-1.5">
                          <Metric label="Risk" value={String(intel.riskScore)} tone={SEV_TEXT[t.riskLevel]} />
                          <Metric label="Confidence" value={intel.confidence} />
                          <Metric label="Source" value={intel.reliability} tone={intel.reliability === "Verified" ? "text-risk-low" : undefined} />
                        </div>
                      </div>

                      {/* Investigation timeline */}
                      <div className="rounded-lg border border-border bg-bg-subtle/30 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Investigation timeline</p>
                          <span className={cn("text-[9px] font-semibold uppercase", isReal ? "text-risk-low" : "text-slate-600")}>
                            {isReal ? "Recorded" : "Projected"}
                          </span>
                        </div>
                        <ol className="relative ml-1 space-y-2 border-l border-border pl-4">
                          {timeline.map((step, i) => {
                            const SIcon = AGENT_ICON[step.agent as keyof typeof AGENT_ICON] ?? Brain;
                            return (
                              <li key={i} className="relative">
                                <span className="absolute -left-[21px] flex h-4 w-4 items-center justify-center rounded-full bg-bg-elevated ring-1 ring-border">
                                  <SIcon className="h-2.5 w-2.5 text-brand-fg" />
                                </span>
                                <p className="text-xs text-slate-300">{step.label}</p>
                                <p className="text-[10px] text-slate-600">
                                  {step.agent === "user" ? "You" : `${titleCase(String(step.agent))} agent`}
                                  {step.at ? ` · ${timeAgo(step.at)}` : ""}
                                </p>
                              </li>
                            );
                          })}
                        </ol>
                      </div>

                      {/* Action workflow */}
                      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                        <Link href="/dashboard/playbooks" className={buttonClasses("primary", "sm")}>
                          <Zap className="h-3.5 w-3.5" /> Generate response
                        </Link>
                        <Link href="/dashboard/cases" className={buttonClasses("secondary", "sm")}>
                          <ArrowUpRight className="h-3.5 w-3.5" /> Open case
                        </Link>
                        <Link href="/dashboard/agents" className={buttonClasses("secondary", "sm")}>
                          <Brain className="h-3.5 w-3.5" /> Assign agent
                        </Link>
                        {!t.acknowledged && (
                          <form action={acknowledgeThreatAction} className="ml-auto">
                            <input type="hidden" name="id" value={t.id} />
                            <button type="submit" className={buttonClasses("secondary", "sm")}>Acknowledge</button>
                          </form>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="text-center">
      <p className={cn("text-sm font-bold text-white", tone)}>{value}</p>
      <p className="text-[9px] uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  );
}
