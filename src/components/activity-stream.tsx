import { Bot, ScrollText, ShieldAlert, Siren, Trash2, Workflow } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui";
import { cn, timeAgo } from "@/lib/ui";
import type { EventKind, EventSeverity, FeedEvent } from "@/lib/events/feed";

const kindIcon: Record<EventKind, LucideIcon> = {
  agent: Bot,
  audit: ScrollText,
  threat: ShieldAlert,
  incident: Siren,
  removal: Trash2,
  playbook: Workflow,
};

const sevColor: Record<EventSeverity, string> = {
  info: "text-slate-400 bg-slate-500/10 ring-slate-500/30",
  low: "text-risk-low bg-risk-low/10 ring-risk-low/30",
  medium: "text-risk-medium bg-risk-medium/10 ring-risk-medium/30",
  high: "text-risk-high bg-risk-high/10 ring-risk-high/30",
  critical: "text-risk-critical bg-risk-critical/10 ring-risk-critical/30",
};

/**
 * The Command Center live operations stream. Renders the unified, time-ordered
 * feed of agent actions, threats, incidents, audit events and removal
 * transitions with a pulsing "live" indicator.
 */
export function ActivityStream({ events, live }: { events: FeedEvent[]; live: boolean }) {
  return (
    <Card className="flex h-full flex-col">
      <SectionTitle
        title="Operations stream"
        subtitle="Every defensive action, in real time"
        action={
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-risk-low">
            <span className="relative flex h-2 w-2">
              <span className={cn("absolute inline-flex h-full w-full rounded-full bg-risk-low opacity-75", live && "animate-ping")} />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-risk-low" />
            </span>
            {live ? "LIVE" : "SAMPLE"}
          </span>
        }
      />
      <ol className="relative ml-1 max-h-[26rem] space-y-4 overflow-y-auto border-l border-border pl-5 pt-1">
        {events.map((e) => {
          const Icon = kindIcon[e.kind];
          return (
            <li key={e.id} className="relative">
              <span
                className={cn(
                  "absolute -left-[27px] flex h-5 w-5 items-center justify-center rounded-full ring-1",
                  sevColor[e.severity],
                )}
              >
                <Icon className="h-3 w-3" />
              </span>
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium leading-snug text-white">{e.title}</p>
                <span className="shrink-0 text-[11px] text-slate-500">{timeAgo(e.at)}</span>
              </div>
              {e.detail && <p className="mt-0.5 text-xs text-slate-500">{e.detail} · {e.source}</p>}
            </li>
          );
        })}
        {events.length === 0 && <li className="text-sm text-slate-500">No activity yet — run a scan to begin.</li>}
      </ol>
    </Card>
  );
}
