import { UserCog, ShieldCheck, AlertTriangle, KeyRound, Database, RefreshCw } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, DataBadge, PageHeader, RiskBadge, SectionTitle } from "@/components/ui";
import { getModuleData } from "@/lib/data/modules";
import {
  buildWorkforce, summarizeWorkforce, rotationWorkflow,
  type EmployeeRisk, type WorkforcePostureLevel,
} from "@/lib/intelligence/workforce-risk";
import { cn, timeAgo } from "@/lib/ui";

export const metadata = { title: "Employee Exposure" };

const POSTURE: Record<WorkforcePostureLevel, { label: string; cls: string; bg: string; ring: string }> = {
  secure: { label: "Secure", cls: "text-risk-low", bg: "bg-risk-low/10", ring: "ring-risk-low/30" },
  elevated: { label: "Elevated", cls: "text-risk-medium", bg: "bg-risk-medium/10", ring: "ring-risk-medium/30" },
  critical: { label: "Critical", cls: "text-risk-high", bg: "bg-risk-high/10", ring: "ring-risk-high/30" },
};

function fmtRecords(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

export default async function EmployeesPage() {
  const moduleData = await getModuleData();
  const { employeeExposures, credentialLeaks } = moduleData;
  const people = buildWorkforce(employeeExposures, credentialLeaks);
  const posture = summarizeWorkforce(employeeExposures, credentialLeaks);
  const rotation = rotationWorkflow();
  const P = POSTURE[posture.postureLevel];

  return (
    <div className="space-y-5">
      <PageHeader
        icon={UserCog}
        title="Employee Exposure & Credential Leaks"
        subtitle="Per-employee workforce risk — exposed data and corporate credential leaks joined into one profile with the remediation each person needs."
        actions={
          <div className="flex flex-col items-end gap-2">
            <DataBadge live={moduleData.live} />
            <span className={cn("inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ring-1", P.bg, P.cls, P.ring)}>
              Workforce: {P.label}
            </span>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Kpi label="Employees affected" value={String(posture.employeesAffected)} icon={UserCog} tone="text-white" />
        <Kpi label="Critical" value={String(posture.critical)} icon={AlertTriangle} tone={posture.critical > 0 ? "text-risk-high" : "text-risk-low"} />
        <Kpi label="Credential leaks" value={String(posture.credentialLeaks)} icon={KeyRound} tone={posture.credentialLeaks > 0 ? "text-risk-high" : "text-risk-low"} />
        <Kpi label="Records exposed" value={fmtRecords(posture.exposedRecords)} icon={Database} tone="text-risk-high" />
        <Kpi label="Workforce posture" value={String(posture.posture)} icon={ShieldCheck} tone={P.cls} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Register */}
        <Card className="p-4 lg:col-span-2">
          <SectionTitle title="Workforce risk register" subtitle="Highest-risk employees first" action={<span className="text-xs text-slate-500">{people.length} people</span>} />
          <ul className="space-y-2">
            {people.map((p) => <EmployeeRow key={p.email} p={p} />)}
          </ul>
        </Card>

        {/* Rotation workflow */}
        <Card className="p-4">
          <SectionTitle title="Credential-rotation playbook" subtitle="Applied to leaked accounts" action={<RefreshCw className="h-4 w-4 text-slate-500" />} />
          <ol className="space-y-1.5">
            {rotation.map((s) => (
              <li key={s.step} className="flex items-center gap-2.5 rounded-lg border border-border bg-bg-subtle/40 px-3 py-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bg-elevated text-[11px] font-bold text-slate-400">{s.step}</span>
                <span className="text-xs text-slate-300">{s.action}</span>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}

function EmployeeRow({ p }: { p: EmployeeRisk }) {
  const initials = (p.name ?? p.email).split(/[\s@.]/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("");
  return (
    <li className="rounded-xl border border-border bg-bg-subtle/40">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-3 p-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-muted text-xs font-semibold text-brand-fg">{initials}</div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-white">{p.name ?? p.email}</p>
              <RiskBadge level={p.highestRisk} />
            </div>
            <p className="truncate text-[11px] text-slate-500">
              {p.name ? `${p.email} · ` : ""}{p.leaks.length} leak{p.leaks.length === 1 ? "" : "s"} · {p.exposures.length} exposure{p.exposures.length === 1 ? "" : "s"}
            </p>
          </div>
        </summary>
        <div className="space-y-3 border-t border-border px-3.5 py-3">
          {p.leaks.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Breach exposure</p>
              <ul className="space-y-1">
                {p.leaks.map((l) => (
                  <li key={l.id} className="flex items-center justify-between rounded-lg border border-border bg-bg-subtle/40 px-2.5 py-1.5 text-xs">
                    <span className="text-slate-300">{l.breachName} — {l.dataClasses.join(", ")}</span>
                    <span className="text-slate-500">{l.leakedAt ? timeAgo(l.leakedAt) : "—"}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {p.exposures.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Exposures</p>
              <ul className="space-y-1">
                {p.exposures.map((e) => (
                  <li key={e.id} className="flex items-center justify-between rounded-lg border border-border bg-bg-subtle/40 px-2.5 py-1.5 text-xs">
                    <span className="text-slate-300">{e.exposureType} · {e.source.replace(/_/g, " ")}</span>
                    <span className="text-slate-500">{timeAgo(e.detectedAt)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Remediation</p>
            <ul className="space-y-1">
              {p.actions.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-fg" /> {a}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </details>
    </li>
  );
}

function Kpi({ label, value, icon: Icon, tone }: { label: string; value: string; icon: LucideIcon; tone?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</span>
        <Icon className="h-3.5 w-3.5 text-slate-500" />
      </div>
      <p className={cn("mt-1 text-2xl font-bold", tone)}>{value}</p>
    </Card>
  );
}
