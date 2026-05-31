import Link from "next/link";
import {
  Crown, ShieldCheck, MapPin, UserX, KeyRound, Megaphone, Home, ShieldAlert,
  ArrowRight, Siren, FileLock2, CheckCircle2, AlertTriangle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, PageHeader, RiskBadge, SectionTitle } from "@/components/ui";
import { getDataSource } from "@/lib/data";
import {
  assessExecutive,
  type DomainStatus, type PostureStatus, type ProtectionDomain, type ProtectiveAction,
} from "@/lib/intelligence/executive-protection";
import { cn, titleCase } from "@/lib/ui";

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

const URGENCY: Record<ProtectiveAction["urgency"], string> = {
  critical: "text-risk-critical bg-risk-critical/10 ring-risk-critical/30",
  high: "text-risk-high bg-risk-high/10 ring-risk-high/30",
  medium: "text-risk-medium bg-risk-medium/10 ring-risk-medium/30",
};

export default async function ExecutivePage() {
  const { exposures, threats } = await (await getDataSource()).getDataset();
  const posture = assessExecutive(exposures, threats);
  const P = POSTURE[posture.status];
  const PIcon = P.icon;
  const physicalThreats = threats.filter((t) => !t.acknowledged && ["doxxing", "location_exposure"].includes(t.kind));

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Crown}
        title="Executive Protection"
        subtitle="VIP-grade protection across physical safety, impersonation, credentials, reputation and residence — one principal-level posture with a prioritized hardening plan."
        actions={
          <span className={cn("inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ring-1", P.bg, P.cls, P.ring)}>
            <span className={cn("h-2 w-2 rounded-full", P.dot)} />
            {posture.tier} tier
          </span>
        }
      />

      {/* Posture + protection score */}
      <Card className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <ProtectionGauge score={posture.protectionScore} />
          <div className="min-w-0 flex-1">
            <div className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold ring-1", P.bg, P.cls, P.ring)}>
              <PIcon className="h-3.5 w-3.5" /> {P.label} posture
            </div>
            <p className="mt-2 text-sm text-slate-300">
              Recommended protection tier: <span className="font-semibold text-white">{posture.tier}</span>.{" "}
              {posture.activeThreats === 0
                ? "No active threats against the principal."
                : `${posture.activeThreats} active threat${posture.activeThreats === 1 ? "" : "s"} under management.`}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <Mini label="Physical signals" value={posture.physicalSignals} tone={posture.physicalSignals > 0 ? "text-risk-high" : "text-risk-low"} />
              <Mini label="Residence exposures" value={posture.residenceExposures} tone={posture.residenceExposures > 0 ? "text-risk-medium" : "text-risk-low"} />
              <Mini label="Active threats" value={posture.activeThreats} tone="text-white" />
            </div>
          </div>
        </div>
      </Card>

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
            <Link href="/dashboard/incidents" className="inline-flex items-center gap-1 font-medium text-brand-fg hover:underline"><Siren className="h-3.5 w-3.5" /> Incident response</Link>
            <Link href="/dashboard/evidence" className="inline-flex items-center gap-1 font-medium text-brand-fg hover:underline"><FileLock2 className="h-3.5 w-3.5" /> Evidence vault</Link>
            <Link href="/dashboard/cases" className="inline-flex items-center gap-1 font-medium text-brand-fg hover:underline">Open cases <ArrowRight className="h-3.5 w-3.5" /></Link>
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

/** Protection gauge — higher score = better protected (green). */
function ProtectionGauge({ score }: { score: number }) {
  const radius = 52;
  const circ = 2 * Math.PI * radius;
  const dash = (score / 100) * circ;
  const color = score >= 75 ? "#22c55e" : score >= 45 ? "#eab308" : "#ef4444";
  return (
    <div className="relative shrink-0" style={{ height: 128, width: 128 }}>
      <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#1f2430" strokeWidth="10" />
        <circle cx="60" cy="60" r={radius} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${dash} ${circ}`} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-white">{score}</span>
        <span className="text-[10px] text-slate-400">protected</span>
      </div>
    </div>
  );
}

function Mini({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg-subtle/40 p-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={cn("mt-0.5 text-xl font-bold", tone)}>{value}</p>
    </div>
  );
}
