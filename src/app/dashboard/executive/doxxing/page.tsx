import { UserX, MapPin, Phone, Users, Briefcase, Send } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, PageHeader, RiskBadge, SectionTitle } from "@/components/ui";
import { getDataSource } from "@/lib/data";
import { getModuleData } from "@/lib/data/modules";
import {
  doxxingReport, takedownPlan, LEAK_LABEL, TAKEDOWN_LABEL,
  type LeakKind, type TakedownPriority,
} from "@/lib/executive/os/doxxing";
import { cn, timeAgo, titleCase } from "@/lib/ui";
import { ExecutiveTabs } from "../tabs";

export const metadata = { title: "Executive — Doxxing" };

const KIND_ICON: Record<LeakKind, LucideIcon> = {
  address: MapPin, phone: Phone, family: Users, employer: Briefcase,
};

const TAKEDOWN_PRIORITY: Record<TakedownPriority, string> = {
  critical: "text-risk-critical bg-risk-critical/10 ring-risk-critical/30",
  high: "text-risk-high bg-risk-high/10 ring-risk-high/30",
  standard: "text-slate-400 bg-bg-elevated ring-border",
};

export default async function DoxxingPage() {
  const { exposures, threats } = await (await getDataSource()).getDataset();
  const { familyMembers, employeeExposures } = await getModuleData();
  const r = doxxingReport({ exposures, threats, family: familyMembers, employees: employeeExposures });
  const plan = takedownPlan(r);

  return (
    <div className="space-y-5">
      <PageHeader
        icon={UserX}
        title="Doxxing Protection"
        subtitle="The leaks that enable doxxing — address, phone, family and employer — detected across brokers, breaches, the dark web and people-search."
        actions={
          <span className={cn("inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ring-1", r.total === 0 ? "bg-risk-low/10 text-risk-low ring-risk-low/30" : "bg-risk-high/10 text-risk-high ring-risk-high/30")}>
            {r.total} leak{r.total === 1 ? "" : "s"}
          </span>
        }
      />
      <ExecutiveTabs />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(Object.keys(r.byKind) as LeakKind[]).map((k) => {
          const Icon = KIND_ICON[k];
          const n = r.byKind[k];
          return (
            <Card key={k} className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{LEAK_LABEL[k]}</span>
                <Icon className="h-3.5 w-3.5 text-slate-500" />
              </div>
              <p className={cn("mt-1 text-2xl font-bold", n > 0 ? "text-risk-high" : "text-risk-low")}>{n}</p>
            </Card>
          );
        })}
      </div>

      <Card className="p-4">
        <SectionTitle title="Detected leaks" subtitle="Highest-risk first" action={<span className="text-xs text-slate-500">{r.total} total</span>} />
        {r.leaks.length === 0 ? (
          <p className="text-sm text-slate-500">No doxxing-enabling leaks detected for the principal.</p>
        ) : (
          <ul className="space-y-2">
            {r.leaks.map((l, i) => {
              const Icon = KIND_ICON[l.kind];
              return (
                <li key={i} className="flex items-center gap-3 rounded-lg border border-border bg-bg-subtle/40 px-3 py-2">
                  <Icon className="h-4 w-4 shrink-0 text-brand-fg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{l.detail}</p>
                    <p className="text-[11px] text-slate-500">
                      {LEAK_LABEL[l.kind]} · {titleCase(l.source)}{l.detectedAt && <> · {timeAgo(l.detectedAt)}</>}
                    </p>
                  </div>
                  <RiskBadge level={l.riskLevel} />
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {plan.length > 0 && (
        <Card className="p-4">
          <SectionTitle
            title="Takedown plan"
            subtitle="Each leak routed to its remediation channel — highest priority first"
            action={<span className="inline-flex items-center gap-1 text-xs text-slate-500"><Send className="h-3.5 w-3.5" /> {plan.length} routed</span>}
          />
          <ul className="space-y-2">
            {plan.map((a, i) => {
              const Icon = KIND_ICON[a.leakKind];
              return (
                <li key={i} className="flex items-center gap-3 rounded-lg border border-border bg-bg-subtle/40 px-3 py-2">
                  <Icon className="h-4 w-4 shrink-0 text-brand-fg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{TAKEDOWN_LABEL[a.method]}</p>
                    <p className="truncate text-[11px] text-slate-500">{LEAK_LABEL[a.leakKind]} · {titleCase(a.target)}</p>
                  </div>
                  <span className={cn("shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1", TAKEDOWN_PRIORITY[a.priority])}>{a.priority}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
