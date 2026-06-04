import {
  Banknote, ShieldCheck, CreditCard, Landmark, EyeOff, AlertTriangle, ArrowRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, PageHeader, SectionTitle } from "@/components/ui";
import { getDataSource } from "@/lib/data";
import { getModuleData } from "@/lib/data/modules";
import { financialOverview, type FinancialFinding } from "@/lib/financial/os/financial-os";
import { creditOverview, CREDIT_ALERT_LABEL, isFraudIndicator, type CreditBand } from "@/lib/credit/credit-os";
import { resolveCreditSource } from "@/lib/credit/source";
import { getEntitlements } from "@/lib/billing/subscription";
import Link from "next/link";
import { cn, timeAgo, titleCase } from "@/lib/ui";
import type { RiskLevel } from "@/lib/types";

export const metadata = { title: "Financial Exposure" };

const BAND_TONE: Record<string, string> = {
  low: "text-risk-low", elevated: "text-risk-medium", high: "text-risk-high", critical: "text-risk-critical",
};
const CREDIT_TONE: Record<CreditBand, string> = {
  excellent: "text-risk-low", good: "text-risk-low", fair: "text-risk-medium", poor: "text-risk-high",
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
  const data = await ds.getDataset();
  const { exposures, threats } = data;
  const { credentialLeaks } = await getModuleData();
  const fin = financialOverview({ exposures, credentialLeaks, threats });

  // Credit monitoring — a paid feature (Premium/Family · Executive · Business).
  // Connector-driven (live behind a bureau/aggregator key, deterministic demo
  // otherwise; never claims live data it does not have).
  const entitlements = await getEntitlements();
  const creditEntitled = entitlements.features.credit;
  const { profile, live: creditLive } = await resolveCreditSource().fetch(data.subject.id);
  const credit = creditOverview(profile, { live: creditLive });

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

      {/* Credit monitoring — across the three bureaus (paid feature) */}
      {!creditEntitled ? (
        <Card className="flex flex-wrap items-center gap-3 p-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand/15 text-brand"><CreditCard className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">Credit monitoring</p>
            <p className="text-[11px] text-slate-400">Continuous credit-file monitoring across all three bureaus — new accounts, inquiries, derogatory marks and score changes. Included with Premium, Family, Executive and Business plans.</p>
          </div>
          <Link href="/pricing" className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand/90">
            Upgrade to enable <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Card>
      ) : (
      <Card className="p-4">
        <SectionTitle
          title="Credit monitoring"
          subtitle="Continuous watch on your credit file for the events that signal identity theft"
          action={
            <span className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1",
              credit.live ? "text-risk-low ring-risk-low/30" : "text-slate-400 ring-border",
            )}>
              <span className={cn("h-1.5 w-1.5 rounded-full", credit.live ? "bg-risk-low" : "bg-slate-500")} />
              {credit.live ? "Live" : "Demo"}
            </span>
          }
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-border bg-bg-subtle/40 p-3">
            <span className="text-[11px] uppercase tracking-wide text-slate-400">Credit score</span>
            <p className={cn("mt-0.5 text-2xl font-bold", CREDIT_TONE[credit.band])}>
              {credit.score}
              {credit.scoreDelta !== 0 && (
                <span className={cn("ml-1.5 align-middle text-xs font-semibold", credit.scoreDelta > 0 ? "text-risk-low" : "text-risk-high")}>
                  {credit.scoreDelta > 0 ? "+" : ""}{credit.scoreDelta}
                </span>
              )}
            </p>
            <p className="text-[11px] capitalize text-slate-500">{credit.band}</p>
          </div>
          <Stat label="Active alerts" value={credit.alertCount} />
          <Stat label="Fraud indicators" value={credit.fraudIndicators} tone={credit.fraudIndicators > 0 ? "text-risk-high" : "text-risk-low"} />
          <Stat label="Bureaus reporting" value={`${credit.bureausReporting}/3`} />
        </div>

        {credit.alerts.length > 0 && (
          <ul className="mt-3 space-y-2">
            {credit.alerts.slice(0, 5).map((a) => (
              <li key={a.id} className="flex items-center gap-3 rounded-lg border border-border bg-bg-subtle/40 p-3">
                <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ring-1", RISK_CLS[a.riskLevel])}>{a.riskLevel}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">
                    {CREDIT_ALERT_LABEL[a.kind]}
                    {isFraudIndicator(a.kind) && <span className="ml-2 rounded bg-risk-high/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-risk-high">Possible fraud</span>}
                  </p>
                  <p className="truncate text-[11px] text-slate-500">{a.detail} · {titleCase(a.bureau)}</p>
                </div>
                <span className="shrink-0 text-[10px] text-slate-600">{timeAgo(a.detectedAt)}</span>
              </li>
            ))}
          </ul>
        )}
        {!credit.live && (
          <p className="mt-3 text-[11px] text-slate-500">
            Demo data — bureau monitoring activates with a connected credit partner (FCRA-compliant feed, with your consent).
          </p>
        )}
      </Card>
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

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg-subtle/40 p-3">
      <span className="text-[11px] uppercase tracking-wide text-slate-400">{label}</span>
      <p className={cn("mt-0.5 text-2xl font-bold", tone ?? "text-white")}>{value}</p>
    </div>
  );
}
