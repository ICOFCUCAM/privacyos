import {
  Users, ShieldCheck, Baby, AlertTriangle, GraduationCap, HeartHandshake, User,
  Heart, Camera, MapPin, Share2, Network, ShieldAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, DataBadge, PageHeader, RiskBadge, SectionTitle } from "@/components/ui";
import { getModuleData } from "@/lib/data/modules";
import {
  assessFamily, summarizeFamily,
  type FamilyPosture, type MemberAssessment, type MemberCategory, type MemberStatus, type Safeguard,
} from "@/lib/intelligence/family-protection";
import { executiveRiskIndices } from "@/lib/executive/os/risk-indices";
import { getDataSource } from "@/lib/data";
import {
  buildRegistry, buildFamilyGraph, memberRisks, childSafety, exposureTracking, sharedExposures,
  REGISTRY_LABEL, type RelationCategory, type ExposureVector, type VectorStatus,
} from "@/lib/family/os/family-os";
import { FamilyGraphView } from "@/components/family-graph-view";
import { ExecutiveTabs } from "../executive/tabs";
import { cn, titleCase } from "@/lib/ui";

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

const REGISTRY_ICON: Record<RelationCategory, LucideIcon> = {
  spouse: Heart, child: GraduationCap, parent: HeartHandshake, relative: Users,
};

const VECTOR_ICON: Record<ExposureVector, LucideIcon> = {
  photos: Camera, school: GraduationCap, social: Share2, location: MapPin,
};

const VECTOR_STATUS: Record<VectorStatus, { label: string; cls: string; ring: string }> = {
  clear: { label: "Clear", cls: "text-risk-low", ring: "ring-risk-low/20" },
  monitoring: { label: "Monitoring", cls: "text-risk-medium", ring: "ring-risk-medium/20" },
  exposed: { label: "Exposed", cls: "text-risk-high", ring: "ring-risk-high/30" },
};

function riskTone(score: number): string {
  return score >= 75 ? "text-risk-critical" : score >= 50 ? "text-risk-high" : score >= 25 ? "text-risk-medium" : "text-risk-low";
}

export default async function FamilyPage() {
  const moduleData = await getModuleData();
  const { familyMembers } = moduleData;
  const { subject, exposures } = await (await getDataSource()).getDataset();
  const roster = assessFamily(familyMembers);
  const summary = summarizeFamily(familyMembers);
  const SP = POSTURE[summary.posture];
  const familyIndex = executiveRiskIndices({ exposures: [], threats: [], family: familyMembers, travel: [] }).family;

  // Family Protection OS — registry, exposure vectors, child safety, graph.
  const registry = buildRegistry(familyMembers);
  const shared = sharedExposures(exposures);
  const risks = memberRisks(familyMembers, shared);
  const safety = childSafety(risks);
  const vectors = exposureTracking(familyMembers, exposures);
  const graph = buildFamilyGraph(subject.displayName, familyMembers, exposures);
  const riskById = new Map(risks.map((r) => [r.member.id, r]));

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

      {/* Family registry */}
      <Card className="p-4">
        <SectionTitle title="Family registry" subtitle="Spouse, children, parents and relatives under protection" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {registry.map((g) => {
            const GIcon = REGISTRY_ICON[g.category];
            return (
              <div key={g.category} className="rounded-xl border border-border bg-bg-subtle/40 p-3">
                <div className="flex items-center gap-2">
                  <GIcon className="h-4 w-4 text-brand-fg" />
                  <span className="text-sm font-semibold text-white">{g.label}</span>
                  <span className="ml-auto text-xs text-slate-500">{g.members.length}</span>
                </div>
                <ul className="mt-2 space-y-1">
                  {g.members.map((m) => {
                    const r = riskById.get(m.id);
                    return (
                      <li key={m.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="min-w-0 truncate text-slate-300">{m.displayName}{m.isMinor && <span className="text-slate-500"> · minor</span>}</span>
                        {r && <span className={cn("shrink-0 font-semibold", riskTone(r.total))}>{r.total}</span>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Exposure tracking */}
      <Card className="p-4">
        <SectionTitle title="Exposure tracking" subtitle="Photos, school records, social profiles and shared location" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {vectors.map((v) => {
            const VIcon = VECTOR_ICON[v.vector];
            const VS = VECTOR_STATUS[v.status];
            return (
              <div key={v.vector} className={cn("rounded-xl border bg-bg-subtle/40 p-3 ring-1", VS.ring)}>
                <div className="flex items-center justify-between">
                  <VIcon className="h-4 w-4 text-brand-fg" />
                  <span className={cn("text-[10px] font-semibold uppercase", VS.cls)}>{VS.label}</span>
                </div>
                <p className="mt-1.5 text-sm font-medium text-white">{v.label}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">{v.detail}</p>
                {v.affected > 0 && <p className="mt-1 text-[10px] text-slate-500">{v.affected} affected</p>}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Child safety */}
      {safety.minors > 0 && (
        <Card className="p-4">
          <SectionTitle
            title="Child safety"
            subtitle="Minor monitoring, exposure alerts and per-child risk scoring"
            action={<span className={cn("rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ring-1", safety.alerts.length > 0 ? "bg-risk-high/10 text-risk-high ring-risk-high/30" : "bg-risk-low/10 text-risk-low ring-risk-low/30")}>{safety.alerts.length} alert{safety.alerts.length === 1 ? "" : "s"}</span>}
          />
          <ul className="space-y-2">
            {safety.monitored.map((r) => (
              <li key={r.member.id} className="flex items-center gap-3 rounded-xl border border-border bg-bg-subtle/40 p-3">
                <Baby className="h-4 w-4 shrink-0 text-risk-high" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{r.member.displayName} <span className="text-[11px] text-slate-500">· {r.member.relation}</span></p>
                  <p className="text-[11px] text-slate-500">own {r.own} · inherited {r.propagated} · {r.member.exposuresCount} exposure(s)</p>
                </div>
                {r.total >= 50 && <ShieldAlert className="h-4 w-4 shrink-0 text-risk-high" />}
                <span className={cn("shrink-0 text-lg font-bold", riskTone(r.total))}>{r.total}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Family graph — relationship mapping + risk propagation */}
      <Card className="p-4">
        <SectionTitle
          title="Family graph"
          subtitle="Relationship mapping, shared exposures and risk propagation"
          action={<Network className="h-4 w-4 text-slate-500" />}
        />
        <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
          {/* Shared exposures that propagate */}
          <div className="rounded-xl border border-border bg-bg-subtle/40 p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400"><Share2 className="h-3.5 w-3.5" /> Shared exposures</p>
            {graph.shared.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">No household-shared exposures propagating to relatives.</p>
            ) : (
              <>
                <ul className="mt-2 space-y-1">
                  {graph.shared.slice(0, 5).map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="min-w-0 truncate text-slate-300">{titleCase(e.category)} · {e.sourceName}</span>
                      <span className={cn("shrink-0 font-semibold", riskTone(e.riskLevel === "critical" ? 80 : e.riskLevel === "high" ? 60 : 30))}>{titleCase(e.riskLevel)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 border-t border-border pt-2 text-[11px] text-slate-500">Propagates to all {graph.propagationReach} household member(s).</p>
              </>
            )}
          </div>
          {/* Relationship map: radial risk-propagation graph */}
          <div className="rounded-xl border border-border bg-bg-subtle/40 p-3">
            <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400"><Network className="h-3.5 w-3.5" /> Relationship map · risk propagation</p>
            {graph.edges.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">No relatives on the registry.</p>
            ) : (
              <>
                <FamilyGraphView
                  principal={graph.principal}
                  nodes={graph.edges.map((e) => ({ id: e.member.id, name: e.member.displayName, relationLabel: REGISTRY_LABEL[e.category], risk: e.risk, inherited: e.inherited, isMinor: e.member.isMinor }))}
                />
                <p className="text-center text-[10px] text-slate-500">Node = combined risk · solid edge = inherited household risk · ▾ minor</p>
              </>
            )}
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
