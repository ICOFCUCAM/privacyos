import { Fingerprint, KeyRound, ShieldCheck, Mail, Radio, LifeBuoy } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, DataBadge, PageHeader, SectionTitle } from "@/components/ui";
import { getDataSource } from "@/lib/data";
import { getModuleData } from "@/lib/data/modules";
import {
  buildAccounts, passwordHygiene, identityRisk, restorationPlaybook,
  type IdentityAccount, type RestorationStep,
} from "@/lib/identity/os/identity-os";
import { cn } from "@/lib/ui";
import type { RiskLevel } from "@/lib/types";

export const metadata = { title: "Digital Identity" };

const BAND_TONE: Record<RiskLevel, string> = {
  low: "text-risk-low", medium: "text-risk-medium", high: "text-risk-high", critical: "text-risk-critical",
};
const BAND_RING: Record<RiskLevel, string> = {
  low: "ring-risk-low/30", medium: "ring-risk-medium/30", high: "ring-risk-high/30", critical: "ring-risk-critical/30",
};
const STEP_PRIORITY: Record<RestorationStep["priority"], string> = {
  critical: "text-risk-critical bg-risk-critical/10 ring-risk-critical/30",
  high: "text-risk-high bg-risk-high/10 ring-risk-high/30",
  standard: "text-slate-400 bg-bg-elevated ring-border",
};

export default async function IdentityPage() {
  const { subject } = await (await getDataSource()).getDataset();
  const moduleData = await getModuleData();
  const { credentialLeaks } = moduleData;
  const { exposures } = await (await getDataSource()).getDataset();
  const input = { credentialLeaks, exposures, knownEmails: subject.emails };
  const accounts = buildAccounts(input);
  const risk = identityRisk(accounts);
  const hygiene = passwordHygiene(accounts);
  const playbook = restorationPlaybook(risk);

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Fingerprint}
        title="Digital Identity"
        subtitle="Account-takeover risk per account, password hygiene, dark-web identity monitoring and a restoration playbook."
        actions={
          <div className="flex items-center gap-2">
            <span className={cn("inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ring-1", risk.overall >= 50 ? "bg-risk-high/10 text-risk-high ring-risk-high/30" : risk.overall >= 25 ? "bg-risk-medium/10 text-risk-medium ring-risk-medium/30" : "bg-risk-low/10 text-risk-low ring-risk-low/30")}>
              Identity risk {risk.overall}
            </span>
            <DataBadge live={moduleData.live} />
          </div>
        }
      />

      {/* Score + hygiene */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label="Breached accounts" value={`${risk.breachedAccounts}/${accounts.length}`} icon={Mail} tone={risk.breachedAccounts > 0 ? "text-risk-high" : "text-risk-low"} />
        <Kpi label="Passwords exposed" value={String(risk.passwordsExposed)} icon={KeyRound} tone={risk.passwordsExposed > 0 ? "text-risk-critical" : "text-risk-low"} />
        <Kpi label="Password hygiene" value={`${hygiene.score}/100`} icon={ShieldCheck} tone={hygiene.score >= 75 ? "text-risk-low" : hygiene.score >= 45 ? "text-risk-medium" : "text-risk-high"} sub={`${hygiene.reuseRisk} reuse-risk account(s)`} />
      </div>

      {/* Account inventory */}
      <Card className="p-4">
        <SectionTitle title="Account inventory" subtitle="Each identity, its breach exposure and account-takeover risk — worst first" />
        {accounts.length === 0 ? (
          <p className="text-sm text-slate-500">No accounts on record for the principal.</p>
        ) : (
          <ul className="space-y-2">
            {accounts.map((a) => <AccountRow key={a.account} a={a} />)}
          </ul>
        )}
      </Card>

      {/* Restoration playbook */}
      <Card className="p-4">
        <SectionTitle title="Identity restoration playbook" subtitle="Post-compromise recovery — priority-ordered" action={<LifeBuoy className="h-4 w-4 text-slate-500" />} />
        <ol className="space-y-2">
          {playbook.map((s) => (
            <li key={s.step} className="flex items-center gap-3 rounded-xl border border-border bg-bg-subtle/40 p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bg-elevated text-[11px] font-bold text-slate-400">{s.step}</span>
              <p className="min-w-0 flex-1 text-sm text-slate-200">{s.action}</p>
              <span className={cn("shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1", STEP_PRIORITY[s.priority])}>{s.priority}</span>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}

function AccountRow({ a }: { a: IdentityAccount }) {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-border bg-bg-subtle/40 px-3 py-2">
      <Mail className="h-4 w-4 shrink-0 text-brand-fg" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{a.account}</p>
        <p className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
          {a.breaches > 0 ? `${a.breaches} breach(es)` : "No breach on record"}
          {a.passwordExposed && <span className="inline-flex items-center gap-0.5 rounded bg-risk-critical/10 px-1 py-0.5 text-[9px] font-semibold uppercase text-risk-critical ring-1 ring-risk-critical/30"><KeyRound className="h-2.5 w-2.5" /> password</span>}
          {a.darkWeb && <span className="inline-flex items-center gap-0.5 rounded bg-risk-high/10 px-1 py-0.5 text-[9px] font-semibold uppercase text-risk-high ring-1 ring-risk-high/30"><Radio className="h-2.5 w-2.5" /> dark web</span>}
          {a.dataClasses.length > 0 && <span className="truncate">· {a.dataClasses.slice(0, 3).join(", ")}</span>}
        </p>
      </div>
      <div className={cn("flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-full ring-2", BAND_RING[a.band])}>
        <span className={cn("text-sm font-bold", BAND_TONE[a.band])}>{a.atoRisk}</span>
      </div>
    </li>
  );
}

function Kpi({ label, value, icon: Icon, tone, sub }: { label: string; value: string; icon: LucideIcon; tone?: string; sub?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</span>
        <Icon className="h-3.5 w-3.5 text-slate-500" />
      </div>
      <p className={cn("mt-1 text-2xl font-bold", tone)}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p>}
    </Card>
  );
}
