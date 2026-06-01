import Link from "next/link";
import {
  Crown, ShieldCheck, MapPin, UserX, KeyRound, Megaphone, Home, ShieldAlert,
  ArrowRight, Siren, FileLock2, CheckCircle2, AlertTriangle, Crosshair, LayoutGrid,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, LineChart, PageHeader, RiskBadge, SectionTitle } from "@/components/ui";
import { getDataSource } from "@/lib/data";
import { getModuleData } from "@/lib/data/modules";
import { getScoreHistory } from "@/lib/data/scores";
import {
  assessExecutive,
  type DomainStatus, type PostureStatus, type ProtectionDomain, type ProtectiveAction,
} from "@/lib/intelligence/executive-protection";
import {
  executiveRiskIndices, riskRecommendations, RISK_INDEX_META,
  type RiskBand, type ExecutiveRiskIndices, type RecPriority,
} from "@/lib/executive/os/risk-indices";
import { cn, titleCase } from "@/lib/ui";
import { ExecutiveTabs } from "./tabs";

export const metadata = { title: "Executive Protection" };

const DOMAIN_ICON: Record<ProtectionDomain, LucideIcon> = {
  physical: MapPin, impersonation: UserX, credentials: KeyRound, reputation: Megaphone, residence: Home,
};

const DOMAIN_STATUS: Record<DomainStatus, { label: string; cls: string; ring: string }> = {
  secure: { label: "Secure", cls: "text-risk-low", ring: "ring-risk-low/30" },
  monitoring: { label: "Monitoring", cls: "text-risk-medium", ring: "ring-risk-medium/30" },
  action_required: { label: "Action required", cls: "text-risk-high", ring: "ring-risk-high/30" },
  critical: { label: "Critical", cls: "text-risk-critical", ring: "ring-risk-critical/30" },
};

const POSTURE: Record<PostureStatus, { label: string; cls: string; bg: string; ring: string; dot: string; icon: LucideIcon }> = {
  secure: { label: "Secure", cls: "text-risk-low", bg: "bg-risk-low/10", ring: "ring-risk-low/30", dot: "bg-risk-low", icon: CheckCircle2 },
  elevated: { label: "Elevated", cls: "text-risk-medium", bg: "bg-risk-medium/10", ring: "ring-risk-medium/30", dot: "bg-risk-medium", icon: AlertTriangle },
  critical: { label: "Critical", cls: "text-risk-high", bg: "bg-risk-high/10", ring: "ring-risk-high/30", dot: "bg-risk-high", icon: Siren },
};

const BAND: Record<RiskBand, { cls: string; ring: string; stroke: string }> = {
  low: { cls: "text-risk-low", ring: "ring-risk-low/30", stroke: "#22c55e" },
  elevated: { cls: "text-risk-medium", ring: "ring-risk-medium/30", stroke: "#eab308" },
  high: { cls: "text-risk-high", ring: "ring-risk-high/30", stroke: "#f97316" },
  critical: { cls: "text-risk-critical", ring: "ring-risk-critical/30", stroke: "#ef4444" },
};

const URGENCY: Record<ProtectiveAction["urgency"], string> = {
  critical: "text-risk-critical bg-risk-critical/10 ring-risk-critical/30",
  high: "text-risk-high bg-risk-high/10 ring-risk-high/30",
  medium: "text-risk-medium bg-risk-medium/10 ring-risk-medium/30",
};

const REC_PRIORITY: Record<RecPriority, string> = {
  critical: "text-risk-critical bg-risk-critical/10 ring-risk-critical/30",
  high: "text-risk-high bg-risk-high/10 ring-risk-high/30",
  standard: "text-slate-400 bg-bg-elevated ring-border",
};

function indexTone(v: number): string {
  return v >= 75 ? "text-risk-critical" : v >= 50 ? "text-risk-high" : v >= 25 ? "text-risk-medium" : "text-risk-low";
}

export default async function ExecutivePage() {
  const { exposures, threats } = await (await getDataSource()).getDataset();
  const { familyMembers, travelAlerts } = await getModuleData();
  const indices = executiveRiskIndices({ exposures, threats, family: familyMembers, travel: travelAlerts });
  const posture = assessExecutive(exposures, threats);
  const P = POSTURE[posture.status];
  const B = BAND[indices.band];
  const trend = ((await getScoreHistory()).find((h) => h.kind === "executive")?.points ?? []).map((p) => p.value);
  const recommendations = riskRecommendations({ exposures, threats, family: familyMembers, travel: travelAlerts }, indices);
  const physicalThreats = threats.filter((t) => !t.acknowledged && ["doxxing", "location_exposure"].includes(t.kind));

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Crown}
        title="Executive Protection"
        subtitle="VIP-grade protection — one Executive Risk Score across personal, family, physical, digital and travel security, with residence, doxxing and threat-actor tracking."
        actions={
          <span className={cn("inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ring-1", P.bg, P.cls, P.ring)}>
            <span className={cn("h-2 w-2 rounded-full", P.dot)} />
            {posture.tier} tier
          </span>
        }
      />

      <ExecutiveTabs />

      {/* Executive Risk Score + indices */}
      <Card className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex shrink-0 items-center gap-4">
            <RiskGauge score={indices.overall} stroke={B.stroke} />
            <div>
              <p className="text-sm font-semibold text-white">Executive Risk Score</p>
              <p className={cn("text-xs font-semibold uppercase", B.cls)}>{indices.band} risk</p>
              <p className="mt-1 text-xs text-slate-500">{posture.activeThreats} active threat{posture.activeThreats === 1 ? "" : "s"} · {posture.tier} protection</p>
              {trend.length >= 2 && (
                <div className="mt-2 w-40">
                  <LineChart values={trend} height={32} color={B.stroke} />
                  <p className="text-[10px] text-slate-500">Risk trend</p>
                </div>
              )}
            </div>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-5">
            {RISK_INDEX_META.map((m) => {
              const v = indices[m.key as keyof ExecutiveRiskIndices] as number;
              return (
                <div key={m.key} className="rounded-xl border border-border bg-bg-subtle/40 p-3 text-center">
                  <p className={cn("text-2xl font-bold", indexTone(v))}>{v}</p>
                  <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">{m.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Reduce executive risk — top action per elevated index */}
      {recommendations.length > 0 && (
        <Card className="p-4">
          <SectionTitle title="Reduce executive risk" subtitle="The highest-impact protective action per elevated index" />
          <ul className="space-y-2">
            {recommendations.map((rec) => (
              <li key={rec.index} className="flex items-center gap-3 rounded-xl border border-border bg-bg-subtle/40 p-3">
                <span className={cn("flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg text-xs font-bold ring-1", indexTone(rec.value), "bg-bg-elevated ring-border")}>{rec.value}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-200">{rec.action}</p>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{rec.label} index</p>
                </div>
                <span className={cn("shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1", REC_PRIORITY[rec.priority])}>{rec.priority}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Pillar quick-links */}
      <div className="grid gap-3 sm:grid-cols-3">
        <PillarLink href="/dashboard/executive/residence" icon={Home} title="Residence Protection" detail="Address, property records, satellite & listings" />
        <PillarLink href="/dashboard/executive/doxxing" icon={UserX} title="Doxxing Protection" detail="Address, phone, family & employer leaks" />
        <PillarLink href="/dashboard/executive/threat-actors" icon={Crosshair} title="Threat Actor Tracking" detail="Profiles, escalation & harassment" />
      </div>

      {/* Protection domains */}
      <Card className="p-4">
        <SectionTitle title="Protection domains" subtitle="The surfaces a close-protection team works — each continuously assessed" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {posture.domains.map((d) => {
            const Icon = DOMAIN_ICON[d.domain];
            const S = DOMAIN_STATUS[d.status];
            return (
              <div key={d.domain} className={cn("rounded-xl border border-border bg-bg-subtle/40 p-3.5 ring-1", S.ring)}>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Icon className="h-4 w-4 text-brand-fg" /> {d.label}
                  </span>
                  <span className={cn("text-[11px] font-semibold", S.cls)}>{S.label}</span>
                </div>
                <p className="mt-1.5 text-xs text-slate-400">{d.detail}</p>
                {d.status !== "secure" && (
                  <p className="mt-2 border-t border-border pt-2 text-[11px] text-slate-500">{d.recommendedAction}</p>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Hardening plan */}
        <Card className="p-4">
          <SectionTitle title="Hardening plan" subtitle="Prioritized protective actions" />
          {posture.plan.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-risk-low/30 bg-risk-low/10 px-3.5 py-3 text-sm text-risk-low">
              <ShieldCheck className="h-4 w-4 shrink-0" /> Principal fully hardened — no open protective actions.
            </div>
          ) : (
            <ol className="space-y-2">
              {posture.plan.map((a, i) => {
                const Icon = DOMAIN_ICON[a.domain];
                return (
                  <li key={a.domain} className="flex items-center gap-3 rounded-xl border border-border bg-bg-subtle/40 p-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bg-elevated text-[11px] font-bold text-slate-400">{i + 1}</span>
                    <Icon className="h-4 w-4 shrink-0 text-brand-fg" />
                    <p className="min-w-0 flex-1 text-sm text-slate-200">{a.action}</p>
                    <span className={cn("shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1", URGENCY[a.urgency])}>
                      {a.urgency}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
          <div className="mt-3 flex flex-wrap gap-3 border-t border-border pt-3 text-xs">
            <Link href="/dashboard/executive/command" className="inline-flex items-center gap-1 font-medium text-brand-fg hover:underline"><LayoutGrid className="h-3.5 w-3.5" /> Command view</Link>
            <Link href="/dashboard/incidents" className="inline-flex items-center gap-1 font-medium text-brand-fg hover:underline"><Siren className="h-3.5 w-3.5" /> Incident response</Link>
            <Link href="/dashboard/evidence" className="inline-flex items-center gap-1 font-medium text-brand-fg hover:underline"><FileLock2 className="h-3.5 w-3.5" /> Evidence vault</Link>
          </div>
        </Card>

        {/* Physical-security signals */}
        <Card className="p-4">
          <SectionTitle title="Physical-security signals" subtitle="Doxxing & location exposure — VIP threshold" />
          {physicalThreats.length === 0 ? (
            <p className="text-sm text-slate-500">No active physical-security signals against the principal.</p>
          ) : (
            <ul className="space-y-2.5">
              {physicalThreats.map((t) => (
                <li key={t.id} className="flex items-start gap-3 rounded-xl border border-border bg-bg-subtle/40 p-3">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-risk-high" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-white">{t.title}</p>
                      <RiskBadge level={t.riskLevel} />
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">{titleCase(t.kind)} · {t.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function PillarLink({ href, icon: Icon, title, detail }: { href: string; icon: LucideIcon; title: string; detail: string }) {
  return (
    <Link href={href}>
      <Card className="p-4 transition hover:border-brand/30">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg-elevated text-brand-fg ring-1 ring-border">
            <Icon className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold text-white">{title}</span>
          <ArrowRight className="ml-auto h-4 w-4 text-slate-600" />
        </div>
        <p className="mt-1.5 text-[11px] text-slate-500">{detail}</p>
      </Card>
    </Link>
  );
}

/** Risk gauge — higher score = more risk (red). */
function RiskGauge({ score, stroke }: { score: number; stroke: string }) {
  const radius = 52;
  const circ = 2 * Math.PI * radius;
  const dash = (score / 100) * circ;
  return (
    <div className="relative shrink-0" style={{ height: 128, width: 128 }}>
      <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#1f2430" strokeWidth="10" />
        <circle cx="60" cy="60" r={radius} fill="none" stroke={stroke} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${dash} ${circ}`} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-white">{score}</span>
        <span className="text-[10px] text-slate-400">risk</span>
      </div>
    </div>
  );
}
