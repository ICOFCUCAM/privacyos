import {
  Banknote, ShieldCheck, CreditCard, Landmark, EyeOff, AlertTriangle, ArrowRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, PageHeader, SectionTitle } from "@/components/ui";
import { getDataSource } from "@/lib/data";
import { getModuleData } from "@/lib/data/modules";
import { financialOverview, type FinancialFinding } from "@/lib/financial/os/financial-os";
import { cn } from "@/lib/ui";
import type { RiskLevel } from "@/lib/types";

export const metadata = { title: "Financial Exposure" };

const BAND_TONE: Record<string, string> = {
  low: "text-risk-low", elevated: "text-risk-medium", high: "text-risk-high", critical: "text-risk-critical",
};
const RISK_CLS: Record<RiskLevel, string> = {
  low: "text-risk-low ring-risk-low/30", medium: "text-risk-medium ring-risk-medium/30",
  high: "text-risk-high ring-risk-high/30", critical: "text-risk-critical ring-risk-critical/30",
};
const FINDING_ICON: Record<FinancialFinding["kind"], LucideIcon> = {
  account: Landmark, payment: CreditCard, identity: ShieldCheck, darkweb: EyeOff,
};

export default async function FinancialPage() {
  const ds = await getDataSource();
  const { exposures, threats } = await ds.getDataset();
  const { credentialLeaks } = await getModuleData();
  const fin = financialOverview({ exposures, credentialLeaks, threats });

  const indices: { label: string; value: number }[] = [
    { label: "Identity theft", value: fin.identityTheft },
    { label: "Account takeover", value: fin.accountTakeover },
    { label: "Payment exposure", value: fin.paymentExposure },
    { label: "Dark-web financial", value: fin.darkWebFinancial },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Banknote}
        title="Financial Exposure Protection"
        subtitle="Detection, monitoring and recovery for your financial identity and payment exposure — correlated with your identity, privacy and dark-web findings."
      />

      {/* Overall + sub-indices */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Card className="p-4">
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Financial risk</span>
          <p className={cn("mt-1 text-2xl font-bold", BAND_TONE[fin.band])}>{fin.overall}</p>
          <p className="text-[11px] capitalize text-slate-500">{fin.band}</p>
        </Card>
        {indices.map((i) => (
          <Card key={i.label} className="p-4">
            <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{i.label}</span>
            <p className="mt-1 text-2xl font-bold text-white">{i.value}</p>
          </Card>
        ))}
      </div>

      {fin.caseWorthy && (
        <div className="flex items-center gap-2 rounded-xl border border-risk-high/30 bg-risk-high/10 px-3.5 py-2.5 text-sm text-risk-high">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          High financial exposure detected — a protection case is being opened and money-account remediation prioritized.
        </div>
      )}

      {/* What we found */}
      <Card className="p-4">
        <SectionTitle title="What we found" subtitle="Financial exposure across breaches, brokers and the dark web" action={<span className="text-xs text-slate-500">{fin.findings.length} finding{fin.findings.length === 1 ? "" : "s"}</span>} />
        {fin.findings.length === 0 ? (
          <p className="text-sm text-slate-500">No financial exposure detected. We&rsquo;re monitoring continuously.</p>
        ) : (
          <ul className="space-y-2">
            {fin.findings.map((f, i) => {
              const Icon = FINDING_ICON[f.kind];
              return (
                <li key={i} className="flex items-center gap-3 rounded-lg border border-border bg-bg-subtle/40 p-3">
                  <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg ring-1", RISK_CLS[f.riskLevel])}><Icon className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{f.label}</p>
                    <p className="truncate text-[11px] text-slate-500">{f.detail} · {f.source}</p>
                  </div>
                  <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ring-1", RISK_CLS[f.riskLevel])}>{f.riskLevel}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* What we'll do */}
      {fin.recommendations.length > 0 && (
        <Card className="p-4">
          <SectionTitle title="What we&rsquo;re doing about it" subtitle="Autonomous remediation, prioritized by risk" />
          <ul className="space-y-2">
            {fin.recommendations.map((r, i) => (
              <li key={i} className="flex items-center gap-3 rounded-lg border border-border bg-bg-subtle/40 p-3">
                <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ring-1", RISK_CLS[r.riskLevel])}>{r.riskLevel}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">{r.title}</p>
                  <p className="text-[11px] text-slate-500">{r.rationale}</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-fg">{r.actionLabel} <ArrowRight className="h-3.5 w-3.5" /></span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
