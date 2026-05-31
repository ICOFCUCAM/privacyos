import { Card, Pill, SectionTitle, StatCard } from "@/components/ui";
import { getDataSource } from "@/lib/data";
import { getModuleData } from "@/lib/data/modules";
import { cn, timeAgo, titleCase } from "@/lib/ui";
import type { AgentStatus } from "@/lib/types";

const statusStyle: Record<AgentStatus, string> = {
  running: "bg-risk-low/15 text-risk-low ring-risk-low/30",
  idle: "bg-slate-500/15 text-slate-400 ring-slate-500/30",
  blocked: "bg-risk-medium/15 text-risk-medium ring-risk-medium/30",
  error: "bg-risk-critical/15 text-risk-critical ring-risk-critical/30",
};

export default async function AgentsPage() {
  const data = await (await getDataSource()).getDataset();
  const agents = data.agents;
  const maxItems = Math.max(1, ...agents.map((a) => a.itemsHandled));
  const { agentActions } = await getModuleData();
  const completed = agentActions.filter((a) => a.status === "completed").length;
  const escalations = agentActions.filter((a) => a.kind === "escalate").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Agent Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">
          Eight specialized agents defend you continuously. You see outcomes, not complexity.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Agents online" value={`${agents.filter((a) => a.status === "running").length}/8`} accent="text-risk-low" />
        <StatCard label="Discoveries" value={data.exposures.length + data.threats.length} />
        <StatCard label="Actions completed" value={completed} />
        <StatCard label="Escalations" value={escalations} accent="text-risk-high" />
        <StatCard label="Recommendations" value={data.recommendations.length} accent="text-brand-fg" />
      </div>

      <Card className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-risk-low opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-risk-low" />
          </span>
          <div>
            <p className="text-sm font-semibold text-white">Continuous monitoring active</p>
            <p className="text-xs text-slate-400">
              The agent fleet runs autonomously every day · last run {agentActions[0] ? timeAgo(agentActions[0].createdAt) : "—"}
            </p>
          </div>
        </div>
        <Pill>24/7 · pg_cron / Edge Function</Pill>
      </Card>

      <Card>
        <SectionTitle title="Recent agent activity" subtitle="Autonomous actions across the fleet" />
        <ul className="divide-y divide-border">
          {agentActions.map((a) => (
            <li key={a.id} className="flex items-center gap-3 py-3">
              <Pill>{titleCase(a.agent)}</Pill>
              <span className="flex-1 text-sm text-slate-300">{a.summary}</span>
              <Pill>{titleCase(a.kind)}</Pill>
              <span className="text-xs text-slate-500">{timeAgo(a.createdAt)}</span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {agents.map((a) => (
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
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-subtle">
              <div
                className={cn("h-full rounded-full", a.status === "running" ? "bg-risk-low" : "bg-brand/60")}
                style={{ width: `${(a.itemsHandled / maxItems) * 100}%` }}
              />
            </div>
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
