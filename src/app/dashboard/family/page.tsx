import {
  Users, ShieldCheck, Baby, AlertTriangle, GraduationCap, HeartHandshake, User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, DataBadge, PageHeader, RiskBadge, SectionTitle } from "@/components/ui";
import { getModuleData } from "@/lib/data/modules";
import {
  assessFamily, summarizeFamily,
  type FamilyPosture, type MemberAssessment, type MemberCategory, type MemberStatus, type Safeguard,
} from "@/lib/intelligence/family-protection";
import { executiveRiskIndices } from "@/lib/executive/os/risk-indices";
import { ExecutiveTabs } from "../executive/tabs";
import { cn } from "@/lib/ui";

export const metadata = { title: "Family Protection" };

const CATEGORY_ICON: Record<MemberCategory, LucideIcon> = {
  minor: GraduationCap, elder: HeartHandshake, adult: User,
};

const STATUS: Record<MemberStatus, { label: string; cls: string; ring: string }> = {
  protected: { label: "Protected", cls: "text-risk-low", ring: "ring-risk-low/30" },
  monitoring: { label: "Monitoring", cls: "text-risk-medium", ring: "ring-risk-medium/30" },
  action_required: { label: "Action required", cls: "text-risk-high", ring: "ring-risk-high/30" },
  critical: { label: "Critical", cls: "text-risk-critical", ring: "ring-risk-critical/30" },
};

const POSTURE: Record<FamilyPosture, { label: string; cls: string; bg: string; ring: string }> = {
  secure: { label: "Secure", cls: "text-risk-low", bg: "bg-risk-low/10", ring: "ring-risk-low/30" },
  elevated: { label: "Elevated", cls: "text-risk-medium", bg: "bg-risk-medium/10", ring: "ring-risk-medium/30" },
  critical: { label: "Critical", cls: "text-risk-high", bg: "bg-risk-high/10", ring: "ring-risk-high/30" },
};

const PRIORITY: Record<Safeguard["priority"], string> = {
  critical: "text-risk-critical bg-risk-critical/10 ring-risk-critical/30",
  high: "text-risk-high bg-risk-high/10 ring-risk-high/30",
  standard: "text-slate-400 bg-bg-elevated ring-border",
};

export default async function FamilyPage() {
  const moduleData = await getModuleData();
  const { familyMembers } = moduleData;
  const roster = assessFamily(familyMembers);
  const summary = summarizeFamily(familyMembers);
  const SP = POSTURE[summary.posture];
  const familyIndex = executiveRiskIndices({ exposures: [], threats: [], family: familyMembers, travel: [] }).family;

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Users}
        title="Family Protection"
        subtitle="Protect children, partners and elderly relatives — each with safeguards tuned to who they are, plus a family-wide protection posture."
        actions={
          <div className="flex items-center gap-2">
            <span className={cn("inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ring-1", familyIndex >= 50 ? "bg-risk-high/10 text-risk-high ring-risk-high/30" : familyIndex >= 25 ? "bg-risk-medium/10 text-risk-medium ring-risk-medium/30" : "bg-risk-low/10 text-risk-low ring-risk-low/30")}>
              Family Risk Index {familyIndex}
            </span>
            <DataBadge live={moduleData.live} />
          </div>
        }
      />

      <ExecutiveTabs />

      {/* Posture + summary */}
      <Card className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <ProtectionGauge score={summary.protectionScore} />
          <div className="min-w-0 flex-1">
            <div className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold ring-1", SP.bg, SP.cls, SP.ring)}>
              {SP.label} family posture
            </div>
            <p className="mt-2 text-sm text-slate-300">
              {summary.members} member{summary.members === 1 ? "" : "s"} protected · {summary.minors} minor{summary.minors === 1 ? "" : "s"} with heightened safeguards.
              {summary.mostExposed && summary.mostExposed.member.riskLevel !== "low" && (
                <> Most exposed: <span className="font-semibold text-white">{summary.mostExposed.member.displayName}</span>.</>
              )}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <Mini label="Minors" value={summary.minors} icon={Baby} tone={summary.minors > 0 ? "text-risk-high" : "text-risk-low"} />
              <Mini label="At elevated risk" value={summary.atRisk} icon={AlertTriangle} tone={summary.atRisk > 0 ? "text-risk-high" : "text-risk-low"} />
              <Mini label="Total exposures" value={summary.totalExposures} icon={Users} tone="text-white" />
            </div>
          </div>
        </div>
      </Card>

      {/* Priority safeguards */}
      {summary.plan.length > 0 && (
        <Card className="p-4">
          <SectionTitle title="Priority safeguards" subtitle="The most urgent protective action per at-risk family member" />
          <ol className="space-y-2">
            {summary.plan.map((p, i) => (
              <li key={i} className="flex items-center gap-3 rounded-xl border border-border bg-bg-subtle/40 p-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bg-elevated text-[11px] font-bold text-slate-400">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-200">{p.safeguard.task}</p>
                  <p className="text-[11px] text-slate-500">for {p.member}</p>
                </div>
                <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ring-1", PRIORITY[p.safeguard.priority])}>
                  {p.safeguard.priority}
                </span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {/* Members */}
      <Card className="p-4">
        <SectionTitle title="Family members" subtitle="Each with category-specific safeguards" />
        <div className="grid gap-3 lg:grid-cols-2">
          {roster.map((a) => <MemberCard key={a.member.id} a={a} />)}
        </div>
      </Card>
    </div>
  );
}

function MemberCard({ a }: { a: MemberAssessment }) {
  const S = STATUS[a.status];
  const Icon = CATEGORY_ICON[a.category];
  const m = a.member;
  return (
    <div className={cn("rounded-xl border border-border bg-bg-subtle/40 p-3.5 ring-1", S.ring)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-muted text-brand-fg">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">
              {m.displayName}
              {m.isMinor && <span className="ml-2 rounded bg-risk-high/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-risk-high">Minor</span>}
            </p>
            <p className="text-[11px] text-slate-500">{m.relation} · {m.exposuresCount} exposure{m.exposuresCount === 1 ? "" : "s"}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <RiskBadge level={m.riskLevel} />
          <span className={cn("text-[10px] font-semibold", S.cls)}>{S.label}</span>
        </div>
      </div>
      <div className="mt-2.5 border-t border-border pt-2.5">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Safeguards</p>
        <ul className="space-y-1">
          {a.safeguards.map((s, i) => (
            <li key={i} className="flex items-center gap-2 text-xs text-slate-300">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-brand-fg" />
              <span className="flex-1">{s.task}</span>
              <span className={cn("shrink-0 rounded px-1 py-0.5 text-[9px] font-semibold uppercase ring-1", PRIORITY[s.priority])}>{s.priority}</span>
            </li>
          ))}
        </ul>
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

function Mini({ label, value, icon: Icon, tone }: { label: string; value: number; icon: LucideIcon; tone?: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg-subtle/40 p-2.5">
      <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">
        <Icon className="h-3 w-3" /> {label}
      </p>
      <p className={cn("mt-0.5 text-xl font-bold", tone)}>{value}</p>
    </div>
  );
}
