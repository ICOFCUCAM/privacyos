import { Newspaper, Users, FileText, Send } from "lucide-react";
import { Card, PageHeader, SectionTitle } from "@/components/ui";
import { getDataSource } from "@/lib/data";
import { getModuleData } from "@/lib/data/modules";
import { mediaProgram } from "@/lib/reputation/os/media";
import { ReputationTabs } from "../tabs";

export const metadata = { title: "Reputation — Media" };

export default async function MediaPage() {
  const { subject } = await (await getDataSource()).getDataset();
  const { mentions } = await getModuleData();
  const m = mediaProgram(subject, mentions);

  return (
    <div className="space-y-5">
      <PageHeader icon={Newspaper} title="Earned Media" subtitle="Press opportunities, a journalist database, generated press releases and outreach workflows." />
      <ReputationTabs />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Press opportunities */}
        <Card className="p-4">
          <SectionTitle title="Press opportunities" subtitle="Matched to the principal's story" />
          <div className="space-y-2">
            {m.opportunities.map((o, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-bg-subtle/40 p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">{o.outlet}</p>
                  <p className="text-[11px] text-slate-500">{o.angle}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-semibold text-brand-fg">{o.fit}% fit</p>
                  <p className="text-[10px] text-slate-500">{o.deadlineDays}d window</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Journalists */}
        <Card className="p-4">
          <SectionTitle title="Journalist database" subtitle="Ranked by relevance to the beat" action={<Users className="h-4 w-4 text-slate-500" />} />
          <ul className="space-y-1.5">
            {m.journalists.map((j, i) => (
              <li key={i} className="flex items-center justify-between rounded-lg border border-border bg-bg-subtle/40 px-3 py-2">
                <div>
                  <p className="text-xs font-medium text-white">{j.name} · {j.outlet}</p>
                  <p className="text-[10px] text-slate-500">{j.beat}</p>
                </div>
                <span className="text-xs font-semibold text-brand-fg">{j.relevance}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Press release */}
      <Card className="p-4">
        <SectionTitle title="Generated press release" subtitle="Auto-drafted from the principal's profile & strongest coverage" action={<FileText className="h-4 w-4 text-slate-500" />} />
        <div className="rounded-xl border border-border bg-bg-subtle/40 p-4">
          <p className="text-base font-bold text-white">{m.release.headline}</p>
          <p className="mt-1 text-sm text-slate-400">{m.release.subhead}</p>
          <div className="mt-3 space-y-2 text-xs leading-relaxed text-slate-300">
            <p><span className="font-semibold text-slate-400">{m.release.dateline}</span> {m.release.body[0]}</p>
            {m.release.body.slice(1).map((p, i) => <p key={i}>{p}</p>)}
          </div>
          <p className="mt-3 border-t border-border pt-2 text-[11px] text-slate-500">{m.release.boilerplate}</p>
        </div>
      </Card>

      {/* Outreach workflow */}
      <Card className="p-4">
        <SectionTitle title="Media outreach workflow" subtitle="From shortlist to amplification" action={<Send className="h-4 w-4 text-slate-500" />} />
        <ol className="space-y-1.5">
          {m.outreach.map((s) => (
            <li key={s.step} className="flex items-center gap-3 rounded-lg border border-border bg-bg-subtle/40 px-3 py-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bg-elevated text-[11px] font-bold text-slate-400">{s.step}</span>
              <span className="min-w-0 flex-1 text-xs text-slate-300">{s.action}</span>
              <span className="shrink-0 rounded bg-bg-elevated px-1.5 py-0.5 text-[10px] text-slate-400 ring-1 ring-border">{s.channel}</span>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
