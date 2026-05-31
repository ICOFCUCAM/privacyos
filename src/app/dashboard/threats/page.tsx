import { Card, RiskBadge, Pill } from "@/components/ui";
import { getDataSource } from "@/lib/data";
import { timeAgo, titleCase } from "@/lib/ui";
import { acknowledgeThreatAction } from "@/app/dashboard/actions";

export const metadata = { title: "Threat Feed" };

export default async function ThreatsPage() {
  const ds = await getDataSource();
  const { threats } = await ds.getDataset();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Threat Feed</h1>
        <p className="mt-1 text-sm text-slate-400">
          Time-ordered alerts from dark-web, breach, deepfake and impersonation monitoring.
        </p>
      </div>

      <div className="space-y-3">
        {threats.map((t) => (
          <Card key={t.id} className="flex items-start gap-4">
            <RiskBadge level={t.riskLevel} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-white">{t.title}</p>
                {!t.acknowledged && (
                  <span className="rounded bg-risk-critical/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-risk-critical">
                    New
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-sm text-slate-400">{t.detail}</p>
              <div className="mt-2 flex items-center gap-2">
                <Pill>{titleCase(t.kind)}</Pill>
                <Pill>{titleCase(t.source)}</Pill>
                <span className="text-xs text-slate-500">{timeAgo(t.detectedAt)}</span>
              </div>
            </div>
            {!t.acknowledged && (
              <form action={acknowledgeThreatAction}>
                <input type="hidden" name="id" value={t.id} />
                <button
                  type="submit"
                  className="shrink-0 self-center rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-bg-elevated"
                >
                  Acknowledge
                </button>
              </form>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
