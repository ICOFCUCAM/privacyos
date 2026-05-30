import { Card, RiskBadge, Pill } from "@/components/ui";
import { demoThreats } from "@/lib/data/demo";
import { timeAgo, titleCase } from "@/lib/ui";

export default function ThreatsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Threat Feed</h1>
        <p className="mt-1 text-sm text-slate-400">
          Time-ordered alerts from dark-web, breach, deepfake and impersonation monitoring.
        </p>
      </div>

      <div className="space-y-3">
        {demoThreats.map((t) => (
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
          </Card>
        ))}
      </div>
    </div>
  );
}
