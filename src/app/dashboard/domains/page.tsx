import { Globe, ShieldCheck, AlertTriangle, CheckCircle2, Wrench, Clock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, DataBadge, PageHeader, RiskBadge, SectionTitle } from "@/components/ui";
import { DomainScanButton } from "@/components/domain-scan-button";
import { getModuleData } from "@/lib/data/modules";
import {
  summarizeDomains, domainRegister,
  type DomainPostureLevel, type DomainRiskAssessment,
} from "@/lib/intelligence/domain-risk-intel";
import { cn, timeAgo, titleCase } from "@/lib/ui";

export const metadata = { title: "Domain Monitoring" };

const POSTURE: Record<DomainPostureLevel, { label: string; cls: string; bg: string; ring: string }> = {
  secure: { label: "Secure", cls: "text-risk-low", bg: "bg-risk-low/10", ring: "ring-risk-low/30" },
  elevated: { label: "Elevated", cls: "text-risk-medium", bg: "bg-risk-medium/10", ring: "ring-risk-medium/30" },
  critical: { label: "Critical", cls: "text-risk-high", bg: "bg-risk-high/10", ring: "ring-risk-high/30" },
};

export default async function DomainsPage() {
  const moduleData = await getModuleData();
  const { domains, domainRisks } = moduleData;
  const posture = summarizeDomains(domains, domainRisks);
  const register = domainRegister(domainRisks);
  const P = POSTURE[posture.postureLevel];

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Globe}
        title="Domain Monitoring"
        subtitle="A remediation register for typosquats, spoofable mail, expiring certs, DNS takeover and exposed subdomains — each with a fix action, owner and re-scan cadence."
        actions={
          <div className="flex flex-col items-end gap-2">
            <DataBadge live={moduleData.live} />
            <DomainScanButton />
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Kpi label="Monitored domains" value={String(posture.monitoredDomains)} icon={Globe} tone="text-white" />
        <Kpi label="Open risks" value={String(posture.openRisks)} icon={AlertTriangle} tone={posture.openRisks > 0 ? "text-risk-high" : "text-risk-low"} />
        <Kpi label="Critical / High" value={String(posture.critical)} icon={AlertTriangle} tone={posture.critical > 0 ? "text-risk-high" : "text-risk-low"} />
        <Kpi label="Resolved" value={String(posture.resolved)} icon={CheckCircle2} tone="text-risk-low" />
        <Kpi label="Domain posture" value={String(posture.posture)} icon={ShieldCheck} tone={P.cls} />
      </div>

      {posture.byKind.length > 0 && (
        <Card className="p-4">
          <SectionTitle title="Open risks by type" subtitle="Where domain exposure is concentrated" />
          <div className="flex flex-wrap gap-2">
            {posture.byKind.map((k) => (
              <span key={k.kind} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg-subtle/40 px-2.5 py-1.5 text-xs text-slate-300">
                {titleCase(k.kind)}
                <span className="rounded bg-bg-elevated px-1.5 py-0.5 text-[10px] font-semibold text-white">{k.count}</span>
              </span>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-4">
        <SectionTitle title="Remediation register" subtitle="Open + highest-severity first" action={<span className="text-xs text-slate-500">{register.length} findings</span>} />
        <ul className="space-y-2">
          {register.map((a) => <DomainRow key={a.risk.id} a={a} />)}
        </ul>
      </Card>
    </div>
  );
}

function DomainRow({ a }: { a: DomainRiskAssessment }) {
  const r = a.risk;
  const overdue = a.ageDays > a.cadenceDays;
  return (
    <li className={cn("rounded-xl border border-border bg-bg-subtle/40", r.resolved && "opacity-60")}>
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-3 p-3.5">
          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1", r.resolved ? "bg-risk-low/10 text-risk-low ring-risk-low/30" : "bg-bg-elevated text-brand-fg ring-border")}>
            {r.resolved ? <CheckCircle2 className="h-4 w-4" /> : <Wrench className="h-4 w-4" />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-white">{r.domain}</p>
              <span className="rounded bg-bg-elevated px-1.5 py-0.5 text-[10px] font-medium text-slate-300 ring-1 ring-border">{titleCase(r.kind)}</span>
              <RiskBadge level={r.riskLevel} />
              {r.resolved && <span className="text-[10px] font-semibold text-risk-low">Resolved</span>}
            </div>
            <p className="truncate text-[11px] text-slate-500">{r.detail}</p>
          </div>
        </summary>
        <div className="space-y-3 border-t border-border px-3.5 py-3">
          <div className="flex items-start gap-2 rounded-lg border border-border bg-bg-subtle/40 px-3 py-2">
            <Wrench className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-fg" />
            <p className="text-xs font-medium text-white">{a.action}</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Meta label="Owner" value={a.owner} />
            <Meta label="Re-scan" value={`Every ${a.cadenceDays}d`} />
            <Meta label="Detected" value={`${a.ageDays}d ago`} tone={overdue && !r.resolved ? "text-risk-high" : undefined} />
          </div>
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <Clock className="h-3.5 w-3.5" /> Remediation workflow
            </p>
            <ol className="space-y-1">
              {a.workflow.map((w, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-slate-300">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-bg-elevated text-[10px] font-bold text-slate-400">{i + 1}</span> {w}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </details>
    </li>
  );
}

function Meta({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg-subtle/40 px-2.5 py-1.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cn("text-xs font-medium text-white", tone)}>{value}</p>
    </div>
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
