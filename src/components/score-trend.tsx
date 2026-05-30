import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Card, LineChart, SectionTitle } from "@/components/ui";
import type { ScoreSeries } from "@/lib/data/scores";
import type { ScoreKind } from "@/lib/suite-types";
import { cn } from "@/lib/ui";

const LINE_COLOR: Partial<Record<ScoreKind, string>> = {
  overall: "#6366f1",
  privacy: "#22c55e",
  identity: "#eab308",
};

export function ScoreTrendCard({
  history,
  current,
}: {
  history: ScoreSeries[];
  current: { overall: number; privacy: number; identity: number };
}) {
  const pointsFor = (k: ScoreKind) => history.find((s) => s.kind === k)?.points ?? [];
  const overall = pointsFor("overall");
  const hasHistory = overall.length >= 2;

  const values = hasHistory ? overall.map((p) => p.value) : [current.overall, current.overall];
  const delta = values[values.length - 1] - values[0];
  const Arrow = delta < 0 ? TrendingDown : delta > 0 ? TrendingUp : Minus;
  // For a risk score, a drop is good (green), a rise is bad (red).
  const deltaColor = delta < 0 ? "text-risk-low" : delta > 0 ? "text-risk-critical" : "text-slate-400";

  const minis: { kind: ScoreKind; label: string; value: number }[] = [
    { kind: "overall", label: "Overall", value: current.overall },
    { kind: "privacy", label: "Privacy", value: current.privacy },
    { kind: "identity", label: "Identity", value: current.identity },
  ];

  return (
    <Card>
      <SectionTitle
        title="Risk score trend"
        subtitle={hasHistory ? "From scheduled monitoring snapshots" : "Builds as the 24/7 monitor accumulates snapshots"}
        action={
          <span className={cn("inline-flex items-center gap-1 text-sm font-semibold", deltaColor)}>
            <Arrow className="h-4 w-4" />
            {delta > 0 ? "+" : ""}{delta} pts
          </span>
        }
      />
      <LineChart values={values} color={LINE_COLOR.overall} height={90} />
      <div className="mt-4 grid grid-cols-3 gap-3">
        {minis.map((m) => {
          const pts = pointsFor(m.kind);
          const vals = pts.length >= 2 ? pts.map((p) => p.value) : [m.value, m.value];
          return (
            <div key={m.kind} className="rounded-lg border border-border bg-bg-subtle/60 p-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-slate-400">{m.label}</span>
                <span className="text-lg font-bold text-white">{m.value}</span>
              </div>
              <div className="mt-1">
                <LineChart values={vals} color={LINE_COLOR[m.kind]} height={28} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
