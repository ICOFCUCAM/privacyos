import Link from "next/link";
import {
  Search, ShieldCheck, Scale, Star, Lock, ScanFace, Crown, Building2, ArrowRight,
  Network, Zap, BadgeCheck, Radar, Boxes,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui";
import { cn, timeAgo } from "@/lib/ui";
import type { AgentKind } from "@/lib/types";
import type { AgentRosterEntry, RosterStatus } from "@/lib/intelligence/command-center";

const AGENT_ICON: Record<AgentKind, LucideIcon> = {
  discovery: Search,
  privacy: Lock,
  legal: Scale,
  reputation: Star,
  security: ShieldCheck,
  deepfake: ScanFace,
  executive: Crown,
  business: Building2,
  orchestrator: Network,
  incident: Zap,
  compliance: BadgeCheck,
  threat_intel: Radar,
  vendor: Boxes,
};

const statusDot: Record<RosterStatus, string> = {
  running: "bg-risk-low",
  idle: "bg-slate-500",
  blocked: "bg-risk-medium",
  error: "bg-risk-critical",
  locked: "bg-slate-600",
};

const statusLabel: Record<RosterStatus, string> = {
  running: "ACTIVE",
  idle: "ONLINE",
  blocked: "BLOCKED",
  error: "ERROR",
  locked: "LOCKED",
};

const statusText: Record<RosterStatus, string> = {
  running: "text-risk-low",
  idle: "text-risk-low",
  blocked: "text-risk-medium",
  error: "text-risk-critical",
  locked: "text-slate-500",
};

/**
 * The agent operations panel — the human face of the platform. Each row shows an
 * agent's identity, live status, current task and throughput so the user feels a
 * team of specialists working continuously on their behalf.
 */
export function AgentRoster({
  roster,
  online,
  total = 8,
  live,
  columns = 1,
}: {
  roster: AgentRosterEntry[];
  online: number;
  total?: number;
  live: boolean;
  /** Render the roster as a multi-column grid to reduce vertical height. */
  columns?: 1 | 2;
}) {
  const lockedCount = roster.filter((a) => a.locked).length;
  return (
    <Card className="flex h-full flex-col">
      <SectionTitle
        title="AI Agents"
        subtitle="Specialists working continuously"
        action={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-risk-low/10 px-2 py-0.5 text-xs font-semibold text-risk-low ring-1 ring-risk-low/30">
            <span className="relative flex h-1.5 w-1.5">
              <span className={cn("absolute inline-flex h-full w-full rounded-full bg-risk-low opacity-75", live && "animate-ping")} />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-risk-low" />
            </span>
            {online}/{total} online
          </span>
        }
      />
      <ul className={cn(
        "-mr-1 min-h-0 flex-1 content-start overflow-y-auto pr-1",
        columns === 2 ? "grid grid-cols-1 gap-0.5 sm:grid-cols-2" : "space-y-0.5",
      )}>
        {roster.map((a) => {
          const Icon = a.locked ? Lock : AGENT_ICON[a.kind];
          return (
            <li
              key={a.kind}
              className={cn(
                "rounded-lg p-1.5 transition hover:bg-bg-subtle/50",
                a.locked && "opacity-55",
              )}
            >
              <div className="flex items-center gap-2.5">
                <span className={cn(
                  "relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1",
                  a.locked ? "bg-slate-500/10 ring-border" : "bg-brand/12 ring-brand/20",
                )}>
                  <Icon className={cn("h-3.5 w-3.5", a.locked ? "text-slate-500" : "text-brand-fg")} />
                  <span className={cn("absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-bg-elevated", statusDot[a.status])} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[13px] font-semibold text-white">{a.name}</p>
                    <span className={cn("shrink-0 text-[9px] font-bold tracking-wide", statusText[a.status])}>
                      {statusLabel[a.status]}
                    </span>
                  </div>
                  <p className="truncate text-[11px] text-slate-400">
                    {a.locked
                      ? "Not included in your plan — upgrade to deploy"
                      : a.currentTask ?? a.description}
                  </p>
                </div>
                {!a.locked && (
                  <span className="shrink-0 text-right text-[10px] text-slate-500">
                    {a.itemsHandled}
                    {a.currentTaskAt && <span className="block">{timeAgo(a.currentTaskAt)}</span>}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <Link
        href={lockedCount > 0 ? "/pricing" : "/dashboard/agents"}
        className="mt-2.5 inline-flex items-center justify-center gap-1.5 border-t border-border pt-2.5 text-xs font-medium text-brand-fg hover:underline"
      >
        {lockedCount > 0
          ? <>Deploy {lockedCount} more agent{lockedCount === 1 ? "" : "s"} <ArrowRight className="h-3.5 w-3.5" /></>
          : <>View all agents <ArrowRight className="h-3.5 w-3.5" /></>}
      </Link>
    </Card>
  );
}
