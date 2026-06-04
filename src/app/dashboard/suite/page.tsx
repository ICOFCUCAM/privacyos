import Link from "next/link";
import { LayoutGrid, ArrowRight, ShieldCheck, AlertTriangle } from "lucide-react";
import { Card, PageHeader, SectionTitle } from "@/components/ui";
import { CommandTabs } from "@/components/command-tabs";
import { Sparkline } from "@/components/viz";
import { getDataSource } from "@/lib/data";
import { getModuleData } from "@/lib/data/modules";
import { getScoreHistory } from "@/lib/data/scores";
import { protectionSuite, summarizeSuite, type DomainScore, type SuiteBand } from "@/lib/suite/protection-suite";
import type { ScoreKind } from "@/lib/suite-types";
import { cn } from "@/lib/ui";

/** Protection Suite domain → score-history kind. */
const DOMAIN_KIND: Record<string, ScoreKind> = {
  executive: "executive", identity: "identity", brand: "business", reputation: "reputation", family: "family", travel: "travel",
};
const BAND_STROKE: Record<SuiteBand, string> = {
  low: "#22c55e", elevated: "#eab308", high: "#f97316", critical: "#ef4444",
};

export const metadata = { title: "Protection Suite" };

const BAND: Record<SuiteBand, { label: string; cls: string; ring: string; bar: string }> = {
  low: { label: "Low", cls: "text-risk-low", ring: "ring-risk-low/30", bar: "bg-risk-low" },
  elevated: { label: "Elevated", cls: "text-risk-medium", ring: "ring-risk-medium/30", bar: "bg-risk-medium" },
  high: { label: "High", cls: "text-risk-high", ring: "ring-risk-high/30", bar: "bg-risk-high" },
  critical: { label: "Critical", cls: "text-risk-critical", ring: "ring-risk-critical/30", bar: "bg-risk-critical" },
};

export default async function SuitePage() {
  const { subject, exposures, threats } = await (await getDataSource()).getDataset();
  const mod = await getModuleData();
  const rows = protectionSuite({
    exposures, threats, mentions: mod.mentions, familyMembers: mod.familyMembers, travelAlerts: mod.travelAlerts,
    credentialLeaks: mod.credentialLeaks, domainRisks: mod.domainRisks, employeeExposures: mod.employeeExposures,
    thirdPartyRisks: mod.thirdPartyRisks, subjectEmails: subject.emails,
  });
  const summary = summarizeSuite(rows);
  const history = await getScoreHistory();
  const trendFor = (key: string): number[] => {
    const kind = DOMAIN_KIND[key];
    return kind ? (history.find((h) => h.kind === kind)?.points ?? []).map((p) => p.value) : [];
  };

  return (
    <div className="space-y-5">
      <CommandTabs />
      <PageHeader
        icon={LayoutGrid}
        title="Protection Suite"
        subtitle={`Every protection domain for ${subject.displayName} in one pane — Executive, Family, Travel, Brand, Identity and Reputation.`}
        actions={
          <span className={cn("inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ring-1", summary.atRisk === 0 ? "bg-risk-low/10 text-risk-low ring-risk-low/30" : "bg-risk-high/10 text-risk-high ring-risk-high/30")}>
            {summary.atRisk === 0 ? <ShieldCheck className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
            {summary.atRisk} of {summary.domains} domains at risk
          </span>
        }
      />

      <Card className="p-4">
        <SectionTitle title="Domain scorecard" subtitle="Worst posture first — each links to its operating surface" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((d) => <DomainCard key={d.key} d={d} trend={trendFor(d.key)} />)}
        </div>
      </Card>
    </div>
  );
}

function DomainCard({ d, trend }: { d: DomainScore; trend: number[] }) {
  const B = BAND[d.band];
  return (
    <Link href={d.href}>
      <Card className={cn("p-4 ring-1 transition hover:border-brand/30", B.ring)}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold text-white">{d.label}</p>
            <p className="text-[11px] text-slate-500">{d.caption}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-600" />
        </div>
        <div className="mt-3 flex items-end gap-2">
          <span className={cn("text-3xl font-bold", B.cls)}>{d.score}</span>
          <span className={cn("mb-1 text-[11px] font-semibold uppercase", B.cls)}>{B.label}</span>
          <span className="mb-1 ml-auto text-[10px] text-slate-500">{d.higherIsWorse ? "risk" : "health"}</span>
        </div>
        {trend.length >= 2 ? (
          <div className="mt-2"><Sparkline values={trend} stroke={BAND_STROKE[d.band]} height={26} /></div>
        ) : (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-subtle">
            <div className={cn("h-full rounded-full", B.bar)} style={{ width: `${d.score}%` }} />
          </div>
        )}
      </Card>
    </Link>
  );
}
