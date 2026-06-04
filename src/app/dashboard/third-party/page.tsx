import { Network, ShieldCheck, AlertTriangle, CalendarClock, Layers, ClipboardCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, DataBadge, PageHeader, Pill, RiskBadge, SectionTitle } from "@/components/ui";
import { getModuleData } from "@/lib/data/modules";
import {
  summarizeVendors, vendorRegister,
  type DueDiligenceStage, type ReviewStatus, type VendorAssessment, type VendorPostureLevel,
} from "@/lib/intelligence/vendor-risk";
import { cn, timeAgo } from "@/lib/ui";

export const metadata = { title: "Third-Party Risk" };

const POSTURE: Record<VendorPostureLevel, { label: string; cls: string; bg: string; ring: string }> = {
  managed: { label: "Managed", cls: "text-risk-low", bg: "bg-risk-low/10", ring: "ring-risk-low/30" },
  elevated: { label: "Elevated", cls: "text-risk-medium", bg: "bg-risk-medium/10", ring: "ring-risk-medium/30" },
  critical: { label: "Critical", cls: "text-risk-high", bg: "bg-risk-high/10", ring: "ring-risk-high/30" },
};

const REVIEW: Record<ReviewStatus, { label: string; cls: string }> = {
  current: { label: "Current", cls: "text-risk-low bg-risk-low/10 ring-risk-low/30" },
  due: { label: "Review due", cls: "text-risk-medium bg-risk-medium/10 ring-risk-medium/30" },
  overdue: { label: "Overdue", cls: "text-risk-high bg-risk-high/10 ring-risk-high/30" },
};

const STAGE: Record<DueDiligenceStage, string> = {
  Onboarded: "text-slate-400", Assessed: "text-risk-medium", Remediation: "text-risk-high", Monitoring: "text-risk-low",
};

export default async function ThirdPartyPage() {
  const moduleData = await getModuleData();
  const { thirdPartyRisks } = moduleData;
  const portfolio = summarizeVendors(thirdPartyRisks);
  const register = vendorRegister(thirdPartyRisks);
  const P = POSTURE[portfolio.postureLevel];

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Network}
        title="Third-Party Risk"
        subtitle="A continuous vendor-risk register — review cadence, remediation actions and due-diligence lifecycle for every partner with access to your data and brand."
        actions={
          <div className="flex flex-col items-end gap-2">
            <DataBadge live={moduleData.live} />
            <span className={cn("inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ring-1", P.bg, P.cls, P.ring)}>
              Portfolio: {P.label}
            </span>
          </div>
        }
      />

      {/* Portfolio summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Kpi label="Vendors" value={String(portfolio.total)} icon={Network} tone="text-white" />
        <Kpi label="High risk" value={String(portfolio.highRisk)} icon={AlertTriangle} tone={portfolio.highRisk > 0 ? "text-risk-high" : "text-risk-low"} />
        <Kpi label="Reviews overdue" value={String(portfolio.overdueReviews)} icon={CalendarClock} tone={portfolio.overdueReviews > 0 ? "text-risk-high" : "text-risk-low"} />
        <Kpi label="Avg risk score" value={String(portfolio.avgScore)} icon={Layers} tone={portfolio.avgScore >= 50 ? "text-risk-high" : "text-white"} />
        <Kpi label="Portfolio posture" value={String(portfolio.posture)} icon={ShieldCheck} tone={P.cls} />
      </div>

      {/* Concentration */}
      {portfolio.concentration.length > 0 && (
        <Card className="p-4">
          <SectionTitle title="Category concentration" subtitle="Where third-party exposure is clustered" />
          <div className="flex flex-wrap gap-2">
            {portfolio.concentration.map((c) => (
              <span key={c.category} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg-subtle/40 px-2.5 py-1.5 text-xs text-slate-300">
                {c.category}
                <span className="rounded bg-bg-elevated px-1.5 py-0.5 text-[10px] font-semibold text-white">{c.count}</span>
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Vendor register */}
      <Card className="p-4">
        <SectionTitle
          title="Vendor risk register"
          subtitle="Overdue reviews and highest-risk vendors first"
          action={<span className="text-xs text-slate-500">{register.length} vendors</span>}
        />
        <ul className="space-y-2">
          {register.map((a) => <VendorRow key={a.vendor.id} a={a} />)}
        </ul>
      </Card>
    </div>
  );
}

function VendorRow({ a }: { a: VendorAssessment }) {
  const v = a.vendor;
  const R = REVIEW[a.reviewStatus];
  return (
    <li className="rounded-xl border border-border bg-bg-subtle/40">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-3 p-3.5">
          <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-bg-elevated ring-1 ring-border">
            <span className="text-base font-bold text-white">{v.riskScore}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-white">{v.vendorName}</p>
              <Pill>{v.category}</Pill>
              <RiskBadge level={v.riskLevel} />
            </div>
            <p className="mt-0.5 truncate text-xs text-slate-500">{v.findings}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1", R.cls)}>{R.label}</span>
            <span className={cn("text-[10px] font-medium", STAGE[a.stage])}>{a.stage}</span>
          </div>
        </summary>
        <div className="space-y-3 border-t border-border px-3.5 py-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Meta label="Assessed" value={timeAgo(v.assessedAt)} />
            <Meta label="Review cadence" value={`Every ${a.cadenceDays}d`} />
            <Meta label="Days since review" value={`${a.daysSinceAssessment}d`} />
          </div>
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <ClipboardCheck className="h-3.5 w-3.5" /> Recommended actions
            </p>
            <ul className="space-y-1">
              {a.recommendedActions.map((act, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-fg" /> {act}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </details>
    </li>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg-subtle/40 px-2.5 py-1.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-xs font-medium text-white">{value}</p>
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
