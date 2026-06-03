import { TrendingUp, CalendarDays, Megaphone, Target, Clock } from "lucide-react";
import { Card, PageHeader, SectionTitle } from "@/components/ui";
import { getDataSource } from "@/lib/data";
import { getModuleData } from "@/lib/data/modules";
import { growthProgram } from "@/lib/reputation/os/growth";
import { cn } from "@/lib/ui";
import { ReputationTabs } from "../tabs";

export const metadata = { title: "Reputation — Growth" };

const TRAJECTORY = {
  rising: "text-risk-low", steady: "text-risk-medium", declining: "text-risk-high",
} as const;

export default async function GrowthPage() {
  const { subject } = await (await getDataSource()).getDataset();
  const { mentions } = await getModuleData();
  const g = growthProgram(subject, mentions);

  return (
    <div className="space-y-5">
      <PageHeader icon={TrendingUp} title="Growth & Personal Brand" subtitle="Content strategy, calendar, posting cadence and executive-visibility tracking." />
      <ReputationTabs />

      {/* Executive visibility */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <SectionTitle title="Executive visibility" subtitle="How prominent the principal is across the public web" />
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-white">{g.visibility.score}</p>
            <p className={cn("text-xs font-semibold uppercase", TRAJECTORY[g.visibility.trajectory])}>{g.visibility.trajectory}</p>
          </div>
        </div>
        <ul className="mt-2 space-y-1.5">
          {g.visibility.gaps.map((gap, i) => (
            <li key={i} className="flex items-center gap-2 text-xs text-slate-400"><Target className="h-3.5 w-3.5 text-brand-fg" /> {gap}</li>
          ))}
        </ul>
      </Card>

      {/* Content recommendations */}
      <Card className="p-4">
        <SectionTitle title="Content recommendations" subtitle="Highest-impact content to publish next" />
        <div className="space-y-2">
          {g.recommendations.map((r, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-bg-subtle/40 p-3">
              <Megaphone className="h-4 w-4 shrink-0 text-brand-fg" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">{r.title}</p>
                <p className="text-[11px] text-slate-500">{r.format} · {r.channel} — {r.rationale}</p>
              </div>
              <span className="shrink-0 rounded-md bg-brand/12 px-2 py-0.5 text-[11px] font-semibold text-brand-fg ring-1 ring-brand/25">+{r.impact}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Calendar */}
        <Card className="p-4">
          <SectionTitle title="Content calendar" subtitle="Next two weeks" />
          <ul className="space-y-1.5">
            {g.calendar.map((e, i) => (
              <li key={i} className="flex items-center gap-3 rounded-lg border border-border bg-bg-subtle/40 px-3 py-2">
                <span className="flex h-7 w-7 shrink-0 flex-col items-center justify-center rounded bg-bg-elevated text-[10px] font-bold text-slate-300">
                  <CalendarDays className="h-3 w-3" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-white">{e.title}</p>
                  <p className="text-[10px] text-slate-500">Day {e.day} · {e.format} · {e.channel}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        {/* Posting + pillars */}
        <div className="space-y-5">
          <Card className="p-4">
            <SectionTitle title="Posting suggestions" subtitle="Optimal cadence per platform" />
            <ul className="space-y-1.5">
              {g.posting.map((p, i) => (
                <li key={i} className="flex items-center justify-between rounded-lg border border-border bg-bg-subtle/40 px-3 py-2">
                  <div>
                    <p className="text-xs font-medium text-white">{p.platform}</p>
                    <p className="text-[10px] text-slate-500">{p.focus}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-brand-fg">{p.cadence}</p>
                    <p className="flex items-center justify-end gap-1 text-[10px] text-slate-500"><Clock className="h-2.5 w-2.5" /> {p.bestTime}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-4">
            <SectionTitle title="Brand pillars" subtitle="The narrative to own" />
            <ul className="space-y-1.5">
              {g.pillars.map((p, i) => (
                <li key={i} className="rounded-lg border border-border bg-bg-subtle/40 px-3 py-2">
                  <p className="text-xs font-semibold text-white">{p.pillar}</p>
                  <p className="text-[11px] text-slate-500">{p.description}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
