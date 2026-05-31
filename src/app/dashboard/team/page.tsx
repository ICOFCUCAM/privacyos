import { Users2, UserPlus, ShieldCheck, AlertTriangle, Info } from "lucide-react";
import { buttonClasses, Card, DataBadge, PageHeader, Pill, SectionTitle, StatCard } from "@/components/ui";
import { getMembership, listTeam } from "@/lib/rbac/membership";
import { assignableRoles, can, canManageMember, ROLE_LABEL, type OrgRole } from "@/lib/rbac/roles";
import { analyzeTeam, type GovernanceFinding, type GovernanceLevel } from "@/lib/rbac/team-posture";
import { cn } from "@/lib/ui";
import { changeRoleAction, inviteMemberAction, removeMemberAction } from "./actions";

const roleColor: Record<OrgRole, string> = {
  owner: "text-brand-fg",
  admin: "text-risk-low",
  member: "text-slate-300",
  viewer: "text-slate-400",
};

const GOV_LEVEL: Record<GovernanceLevel, { label: string; cls: string; bg: string; ring: string }> = {
  strong: { label: "Strong", cls: "text-risk-low", bg: "bg-risk-low/10", ring: "ring-risk-low/30" },
  review: { label: "Review", cls: "text-risk-medium", bg: "bg-risk-medium/10", ring: "ring-risk-medium/30" },
  at_risk: { label: "At risk", cls: "text-risk-high", bg: "bg-risk-high/10", ring: "ring-risk-high/30" },
};

const FINDING_ICON = { high: AlertTriangle, medium: AlertTriangle, info: Info } as const;
const FINDING_CLS = { high: "text-risk-high", medium: "text-risk-medium", info: "text-slate-400" } as const;

export default async function TeamPage() {
  const membership = await getMembership();

  if (!membership) {
    return (
      <div className="mx-auto max-w-lg">
        <Card className="text-center">
          <h1 className="text-xl font-semibold text-white">No organization</h1>
          <p className="mt-2 text-sm text-slate-400">
            Team management is available on Business plans. Create an organization to invite teammates.
          </p>
        </Card>
      </div>
    );
  }

  const team = await listTeam(membership.orgId);
  const manage = can(membership.role, "manage_members");
  const assignable = assignableRoles(membership.role);
  const posture = analyzeTeam(team);
  const G = GOV_LEVEL[posture.level];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Users2}
        title="Team & Roles"
        subtitle={`${membership.orgName} · your role: ${ROLE_LABEL[membership.role]}`}
        actions={<DataBadge live={membership.live} />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Members" value={team.filter((m) => m.status === "active").length} />
        <StatCard label="Pending invites" value={team.filter((m) => m.status === "invited").length} accent="text-risk-medium" />
        <StatCard label="Admins" value={team.filter((m) => m.role === "owner" || m.role === "admin").length} />
        <StatCard label="Your access" value={ROLE_LABEL[membership.role]} accent="text-brand-fg" />
      </div>

      {/* Access governance */}
      <Card>
        <SectionTitle title="Access governance" subtitle="Least-privilege posture across the organization" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className={cn("flex shrink-0 flex-col items-center justify-center rounded-xl px-5 py-3 ring-1", G.bg, G.ring)}>
            <span className={cn("text-3xl font-bold", G.cls)}>{posture.governanceScore}</span>
            <span className={cn("text-[11px] font-semibold uppercase tracking-wide", G.cls)}>{G.label}</span>
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="text-xs text-slate-400">
              {posture.admins} privileged · {posture.activeMembers} active · {posture.pendingInvites} pending ·{" "}
              {Math.round(posture.adminRatio * 100)}% admin ratio
            </p>
            <ul className="space-y-1.5">
              {posture.findings.map((f: GovernanceFinding, i) => {
                const Icon = FINDING_ICON[f.severity];
                return (
                  <li key={i} className="flex items-start gap-2 rounded-lg border border-border bg-bg-subtle/40 px-2.5 py-1.5">
                    <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", FINDING_CLS[f.severity])} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-white">{f.label}</p>
                      <p className="text-[11px] text-slate-500">{f.detail}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </Card>

      {manage && (
        <Card>
          <SectionTitle title="Invite a teammate" subtitle="They'll get access scoped to their role" />
          <form action={inviteMemberAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex-1">
              <span className="mb-1 block text-xs font-medium text-slate-400">Email</span>
              <input name="email" type="email" required placeholder="teammate@company.com" className="w-full rounded-lg border border-border bg-bg-subtle px-3 py-2 text-sm text-white outline-none focus:border-brand" />
            </label>
            <label>
              <span className="mb-1 block text-xs font-medium text-slate-400">Role</span>
              <select name="role" defaultValue="member" className="rounded-lg border border-border bg-bg-subtle px-3 py-2 text-sm text-white outline-none focus:border-brand">
                {assignable.filter((r) => r !== "owner").map((r) => (
                  <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                ))}
              </select>
            </label>
            <button type="submit" className={buttonClasses("primary", "md")}>
              <UserPlus className="h-4 w-4" /> Send invite
            </button>
          </form>
          {!membership.live && <p className="mt-2 text-xs text-risk-medium">Demo mode — invites are validated but not persisted.</p>}
        </Card>
      )}

      <Card className="p-0">
        <div className="border-b border-border p-5"><SectionTitle title="Members" /></div>
        <ul className="divide-y divide-border">
          {team.map((m) => {
            const editable = manage && canManageMember(membership.role, m.role) && !m.isSelf;
            return (
              <li key={m.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-muted text-xs font-semibold text-brand-fg">
                    {m.email.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {m.email}{m.isSelf && <span className="ml-2 text-xs text-slate-500">(you)</span>}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className={cn("text-xs font-medium", roleColor[m.role])}>{ROLE_LABEL[m.role]}</span>
                      {m.status === "invited" && <Pill>Invited</Pill>}
                    </div>
                  </div>
                </div>
                {editable ? (
                  <div className="flex items-center gap-2">
                    <form action={changeRoleAction} className="flex items-center gap-1">
                      <input type="hidden" name="id" value={m.id} />
                      <select name="role" defaultValue={m.role} className="rounded-md border border-border bg-bg-subtle px-2 py-1 text-xs text-white outline-none focus:border-brand">
                        {assignable.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                      </select>
                      <button type="submit" className={buttonClasses("secondary", "sm", "gap-0 px-2 py-1")}>Save</button>
                    </form>
                    <form action={removeMemberAction}>
                      <input type="hidden" name="id" value={m.id} />
                      <button type="submit" className={buttonClasses("secondary", "sm", "gap-0 px-2 py-1 text-risk-critical")}>Remove</button>
                    </form>
                  </div>
                ) : (
                  <span className="text-xs text-slate-600">{m.isSelf ? "—" : "View only"}</span>
                )}
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
