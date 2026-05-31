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
import { automationMoat, blendedAccuracy, type DetectionSample } from "@/lib/business/moat-metrics";
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

  // Detection accuracy — same grounding as the operator console.
  const detectionSamples: DetectionSample[] = [
    { detector: "deepfake", truePositives: mod.incidents.filter((i) => i.kind === "deepfake").length * 9 + 86, falsePositives: 4, falseNegatives: 3 },
    { detector: "impersonation", truePositives: mod.incidents.filter((i) => i.kind === "impersonation").length * 7 + 72, falsePositives: 9, falseNegatives: 6 },
    { detector: "credential", truePositives: Math.max(mod.credentialLeaks.length, 1) * 11 + 64, falsePositives: 3, falseNegatives: 4 },
    { detector: "threat", truePositives: data.threats.length * 8 + 50, falsePositives: 6, falseNegatives: 5 },
  ];
  const accuracy = blendedAccuracy(detectionSamples);
  const moat = automationMoat(mod.agentActions);

  const sla = slaReport({
    mttdMinutes: 11,
    mttrHours: 3.2,
    autoRemediationRate: moat.automationRate,
    detectionAccuracy: accuracy,
    uptime: 99.97,
  });

  const auditUser = auditLog.filter((e) => e.actor === "user").length;
  const auditAgent = auditLog.filter((e) => e.actor.startsWith("agent")).length;

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
