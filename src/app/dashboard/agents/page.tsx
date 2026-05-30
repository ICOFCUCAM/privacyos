import { Card } from "@/components/ui";
import { demoAgents } from "@/lib/data/demo";
import { cn, timeAgo } from "@/lib/ui";
import type { AgentStatus } from "@/lib/types";

const statusStyle: Record<AgentStatus, string> = {
  running: "bg-risk-low/15 text-risk-low ring-risk-low/30",
  idle: "bg-slate-500/15 text-slate-400 ring-slate-500/30",
  blocked: "bg-risk-medium/15 text-risk-medium ring-risk-medium/30",
  error: "bg-risk-critical/15 text-risk-critical ring-risk-critical/30",
};

export default function AgentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">AI Agents</h1>
        <p className="mt-1 text-sm text-slate-400">
          Eight specialized agents defend you continuously. You see outcomes, not complexity.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {demoAgents.map((a) => (
          <Card key={a.kind} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white">{a.name}</h2>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1",
                  statusStyle[a.status],
                )}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {a.status}
              </span>
            </div>
            <p className="text-sm text-slate-400">{a.description}</p>
            <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-slate-500">
              <span>{a.itemsHandled} items handled</span>
              {a.lastRunAt && <span>last run {timeAgo(a.lastRunAt)}</span>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
