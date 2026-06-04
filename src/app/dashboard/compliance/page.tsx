import {
  BadgeCheck, ShieldCheck, Clock, Gauge, FileCheck2, CheckCircle2, MinusCircle, Circle, Download,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, PageHeader, SectionTitle } from "@/components/ui";
import { getDataSource } from "@/lib/data";
import { getModuleData } from "@/lib/data/modules";
import { getAuditLog } from "@/lib/audit/audit";
import {
  CONTROLS, postureByCriterion, readiness, slaReport, type ControlStatus, type TrustCriterion,
} from "@/lib/compliance/posture";
import { caseSlaReport } from "@/lib/compliance/case-sla";
import { liveDetectorAccuracy } from "@/lib/detection/live-accuracy";
import { exposureToFinding, runPlaybooks, summarizeRuns, threatToFinding } from "@/lib/agents/playbooks";
import { allFrameworkCoverage, overallFrameworkCoverage, COMPLIANCE_TASKS } from "@/lib/compliance/frameworks";
import { cn } from "@/lib/ui";

export const metadata = { title: "Compliance & SLAs" };

const STATUS_ICON: Record<ControlStatus, LucideIcon> = {
  implemented: CheckCircle2,
  partial: MinusCircle,
  planned: Circle,
};

const STATUS_COLOR: Record<ControlStatus, string> = {
  implemented: "text-risk-low",
  partial: "text-risk-medium",
  planned: "text-slate-500",
};

const STATUS_LABEL: Record<ControlStatus, string> = {
  implemented: "Implemented",
  partial: "Partial",
  planned: "Planned",
};

export default async function CompliancePage() {
  const data = await (await getDataSource()).getDataset();
  const mod = await getModuleData();
  const auditLog = await getAuditLog(100);

  const posture = postureByCriterion();
  const ready = readiness();

  // Detection accuracy — computed by the live scoring algorithms (same as the
  // operator console), not modeled samples.
  const { blended: accuracy } = liveDetectorAccuracy({
    incidents: mod.incidents,
    credentialLeaks: mod.credentialLeaks,
    domainRisks: mod.domainRisks,
    exposures: data.exposures,
    primaryDomain: mod.domains.find((d) => d.isPrimary)?.domain ?? mod.domains[0]?.domain,
  });
  // Auto-remediation rate = the share of response-playbook steps that execute
  // without a human — the single source of truth shared with the playbooks view.
  const playbooks = summarizeRuns(
    runPlaybooks([...data.exposures.map(exposureToFinding), ...data.threats.map(threatToFinding)]),
  );

  const sla = slaReport({
    mttdMinutes: 11,
    mttrHours: 3.2,
    autoRemediationRate: playbooks.automationRate,
    detectionAccuracy: accuracy,
    uptime: 99.97,
  });

  const auditUser = auditLog.filter((e) => e.actor === "user").length;
  const auditAgent = auditLog.filter((e) => e.actor.startsWith("agent")).length;

  const frameworks = allFrameworkCoverage();
  const overallCoverage = overallFrameworkCoverage();

  // Live response-SLA clock: every open case against its risk-based deadline.
  // The scheduler auto-escalates breaches; this renders the same truth.
  const slaClock = caseSlaReport(data.cases);

  return (
    <div className="space-y-4">
      <PageHeader
        icon={BadgeCheck}
        title="Compliance & SLAs"
        subtitle="SOC 2 control posture, detection SLAs and the audit evidence enterprise buyers require."
        actions={
          <a href="/api/reports/compliance" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-bg-elevated">
            <Download className="h-4 w-4" /> Compliance report
          </a>
        }
      />

      {/* Readiness headline */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">SOC 2 readiness</span>
            <ShieldCheck className="h-4 w-4 text-risk-low" />
          </div>
          <p className="mt-1 text-2xl font-bold text-risk-low">{ready.readiness}%</p>
          <p className="text-[11px] text-slate-500">{ready.implemented}/{ready.totalControls} controls implemented</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">SLA attainment</span>
            <Clock className="h-4 w-4 text-brand-fg" />
          </div>
          <p className="mt-1 text-2xl font-bold text-white">{sla.attainment}%</p>
          <p className="text-[11px] text-slate-500">{sla.targets.filter((t) => t.met).length}/{sla.targets.length} targets met</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Detection accuracy</span>
            <Gauge className="h-4 w-4 text-risk-low" />
          </div>
          <p className="mt-1 text-2xl font-bold text-white">{accuracy}%</p>
          <p className="text-[11px] text-slate-500">blended F1 across detectors</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Audit events</span>
            <FileCheck2 className="h-4 w-4 text-slate-300" />
          </div>
          <p className="mt-1 text-2xl font-bold text-white">{auditLog.length}</p>
          <p className="text-[11px] text-slate-500">{auditAgent} agent · {auditUser} user</p>
        </Card>
      </div>

      {/* Regulatory & certification frameworks — executed by the Compliance Agent */}
      <Card className="p-4">
        <SectionTitle
          title="Compliance frameworks"
          subtitle="GDPR · CCPA · SOC 2 · ISO 27001 · HIPAA · PCI-DSS — monitored continuously by the Compliance Agent"
          action={<span className="text-sm font-bold text-risk-low">{overallCoverage}% blended</span>}
        />
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-6">
          {frameworks.map((f) => (
            <div key={f.id} className="rounded-lg border border-border bg-bg-subtle/40 p-3 text-center">
              <p className={cn("text-xl font-bold", f.coverage >= 90 ? "text-risk-low" : f.coverage >= 70 ? "text-risk-medium" : "text-risk-high")}>
                {f.coverage}%
              </p>
              <p className="mt-0.5 text-xs font-medium text-white">{f.name}</p>
              <p className="text-[10px] text-slate-500">{f.met}/{f.total} met</p>
              <p className={cn("mt-1 text-[10px] font-semibold uppercase",
                f.standing === "Compliant" ? "text-risk-low" : f.standing === "On track" ? "text-risk-medium" : "text-risk-high")}>
                {f.standing}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-slate-500">
          The Compliance Agent runs {COMPLIANCE_TASKS.length} continuous-monitoring tasks each cycle — DSAR turnaround,
          breach-notification clocks, audit-log integrity, ISMS drift and cardholder-data checks.
        </p>
      </Card>

      {/* Live response-SLA clock — per-case deadlines, auto-escalated on breach */}
      <Card className="p-4">
        <SectionTitle
          title="Response-SLA clock"
          subtitle="Every open case against its risk-based response deadline — breaches are auto-escalated"
          action={
            <span className={cn("text-sm font-bold", slaClock.breached > 0 ? "text-risk-high" : slaClock.atRisk > 0 ? "text-risk-medium" : "text-risk-low")}>
              {slaClock.attainment}% on-time
            </span>
          }
        />
        <div className="mb-3 grid grid-cols-3 gap-2.5">
          <div className="rounded-lg border border-border bg-bg-subtle/40 p-3 text-center">
            <p className="text-xl font-bold text-risk-low">{slaClock.onTrack}</p>
            <p className="text-[10px] uppercase tracking-wide text-slate-500">On track</p>
          </div>
          <div className="rounded-lg border border-border bg-bg-subtle/40 p-3 text-center">
            <p className="text-xl font-bold text-risk-medium">{slaClock.atRisk}</p>
            <p className="text-[10px] uppercase tracking-wide text-slate-500">At risk</p>
          </div>
          <div className="rounded-lg border border-border bg-bg-subtle/40 p-3 text-center">
            <p className="text-xl font-bold text-risk-high">{slaClock.breached}</p>
            <p className="text-[10px] uppercase tracking-wide text-slate-500">Breached</p>
          </div>
        </div>
        {slaClock.items.length === 0 ? (
          <p className="text-sm text-slate-500">No open cases — every response clock is clear.</p>
        ) : (
          <ul className="space-y-1.5">
            {slaClock.items.slice(0, 6).map((i) => (
              <li key={i.id} className="flex items-center justify-between rounded-lg border border-border bg-bg-subtle/40 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{i.title}</p>
                  <p className="text-[11px] text-slate-500">{i.riskLevel} · due {i.dueAt.slice(0, 10)}</p>
                </div>
                <span className={cn("shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1",
                  i.status === "breached" ? "text-risk-high ring-risk-high/30" : i.status === "at_risk" ? "text-risk-medium ring-risk-medium/30" : "text-risk-low ring-risk-low/30")}>
                  {i.status === "breached" ? "Breached" : i.status === "at_risk" ? `${i.hoursRemaining}h left` : "On track"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* SLA targets */}
      <Card className="p-4">
        <SectionTitle title="Service-level objectives" subtitle="Detection and response targets, measured against attainment" />
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
          {sla.targets.map((t) => (
            <div key={t.name} className="flex items-center justify-between rounded-lg border border-border bg-bg-subtle/40 p-3">
              <div>
                <p className="text-sm font-medium text-white">{t.name}</p>
                <p className="text-[11px] text-slate-500">
                  Target {t.higherIsBetter ? "≥" : "≤"} {t.target}{t.unit === "pct" ? "%" : ` ${t.unit}`}
                </p>
              </div>
              <div className="text-right">
                <p className={cn("text-lg font-bold", t.met ? "text-risk-low" : "text-risk-high")}>
                  {t.actual}{t.unit === "pct" ? "%" : ` ${t.unit}`}
                </p>
                <p className={cn("text-[10px] font-semibold uppercase", t.met ? "text-risk-low" : "text-risk-high")}>
                  {t.met ? "Met" : "At risk"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* SOC 2 criteria coverage */}
      <Card className="p-4">
        <SectionTitle title="SOC 2 Trust Service Criteria" subtitle="Weighted control coverage by criterion" />
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 lg:grid-cols-5">
          {posture.map((p) => (
            <div key={p.criterion} className="rounded-lg border border-border bg-bg-subtle/40 p-3 text-center">
              <p className={cn("text-xl font-bold", p.coverage >= 90 ? "text-risk-low" : p.coverage >= 70 ? "text-risk-medium" : "text-risk-high")}>
                {p.coverage}%
              </p>
              <p className="mt-0.5 text-xs font-medium text-slate-300">{p.label}</p>
              <p className="text-[10px] text-slate-500">{p.implemented}/{p.total} controls</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Control map */}
      <Card className="p-4">
        <SectionTitle title="Control map" subtitle="Every control tied to a shipped platform capability as evidence" />
        <ul className="divide-y divide-border">
          {CONTROLS.map((c) => {
            const Icon = STATUS_ICON[c.status];
            return (
              <li key={c.id} className="flex items-start gap-3 py-2.5">
                <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", STATUS_COLOR[c.status])} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-bg-subtle px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 ring-1 ring-border">{c.id}</span>
                    <span className="text-sm font-medium text-white">{c.name}</span>
                    <span className={cn("text-[10px] font-semibold uppercase", STATUS_COLOR[c.status])}>{STATUS_LABEL[c.status]}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">{c.description}</p>
                  <p className="mt-0.5 text-[11px] text-slate-600">Evidence: {c.evidence}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
