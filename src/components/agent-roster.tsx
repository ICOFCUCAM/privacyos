import Link from "next/link";
import {
  Search, ShieldCheck, Scale, Star, Lock, ScanFace, Crown, Building2, ArrowRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui";
import { cn, timeAgo } from "@/lib/ui";
import type { AgentKind, AgentState } from "@/lib/types";
import type { AgentRosterEntry } from "@/lib/intelligence/command-center";

const AGENT_ICON: Record<AgentKind, LucideIcon> = {
  discovery: Search,
  privacy: Lock,
  legal: Scale,
  reputation: Star,
  security: ShieldCheck,
  deepfake: ScanFace,
  executive: Crown,
  business: Building2,
};

const statusDot: Record<AgentState["status"], string> = {
  running: "bg-risk-low",
  idle: "bg-slate-500",
  blocked: "bg-risk-medium",
  error: "bg-risk-critical",
};

const statusLabel: Record<AgentState["status"], string> = {
  running: "ACTIVE",
  idle: "ONLINE",
  blocked: "BLOCKED",
  error: "ERROR",
};

/**
 * The agent operations panel — the human face of the platform. Each row shows an
 * agent's identity, live status, current task and throughput so the user feels a
 * team of specialists working continuously on their behalf.
 */
export function AgentRoster({
  roster,
  online,
  live,
}: {
  roster: AgentRosterEntry[];
  online: number;
  live: boolean;
}) {
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
            {online}/8 online
          </span>
        }
      />
      <ul className="-mr-1 flex-1 space-y-1 overflow-y-auto pr-1">
        {roster.map((a) => {
          const Icon = AGENT_ICON[a.kind];
          return (
            <li key={a.kind} className="rounded-lg p-2 transition hover:bg-bg-subtle/50">
              <div className="flex items-start gap-3">
                <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/12 ring-1 ring-brand/20">
                  <Icon className="h-4 w-4 text-brand-fg" />
                  <span className={cn("absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-bg-elevated", statusDot[a.status])} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-white">{a.name}</p>
                    <span className={cn(
                      "shrink-0 text-[10px] font-bold tracking-wide",
                      a.status === "running" || a.status === "idle" ? "text-risk-low" : a.status === "error" ? "text-risk-critical" : "text-risk-medium",
                    )}>
                      {statusLabel[a.status]}
                    </span>
                  </div>
                  <p className="truncate text-xs text-slate-400">
                    {a.currentTask ?? a.description}
                  </p>
                  <div className="mt-1 flex items-center gap-3 text-[10px] text-slate-500">
                    <span>{a.itemsHandled} handled</span>
                    <span>{a.completedActions} actions</span>
                    {a.currentTaskAt && <span>{timeAgo(a.currentTaskAt)}</span>}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <Link
        href="/dashboard/agents"
        className="mt-3 inline-flex items-center justify-center gap-1.5 border-t border-border pt-3 text-xs font-medium text-brand-fg hover:underline"
      >
        View all agents <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </Card>
  );
}
