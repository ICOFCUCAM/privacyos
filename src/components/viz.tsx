import type { ReactNode } from "react";
import { cn } from "@/lib/ui";
import type { RiskLevel } from "@/lib/types";

const RISK_HEX: Record<RiskLevel, string> = {
  low: "#22c55e",
  medium: "#eab308",
  high: "#f97316",
  critical: "#ef4444",
};

/** Compact donut for a count broken down by risk level. */
export function RiskDonut({
  segments,
  size = 132,
  label,
}: {
  segments: { level: RiskLevel; value: number }[];
  size?: number;
  label?: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = 52;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#1f2430" strokeWidth="12" />
        {total > 0 &&
          segments.map((seg) => {
            if (seg.value === 0) return null;
            const len = (seg.value / total) * circ;
            const el = (
              <circle
                key={seg.level}
                cx="60"
                cy="60"
                r={r}
                fill="none"
                stroke={RISK_HEX[seg.level]}
                strokeWidth="12"
                strokeDasharray={`${len} ${circ - len}`}
                strokeDashoffset={-offset}
              />
            );
            offset += len;
            return el;
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white">{total}</span>
        {label && <span className="text-[11px] text-slate-400">{label}</span>}
      </div>
    </div>
  );
}

/** Tiny inline sparkline for a numeric series. */
export function Sparkline({
  values,
  className,
  stroke = "#6366f1",
  height = 28,
}: {
  values: number[];
  className?: string;
  stroke?: string;
  height?: number;
}) {
  if (values.length === 0) return null;
  const w = 100;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = w / Math.max(values.length - 1, 1);
  const pts = values.map((v, i) => `${i * step},${height - ((v - min) / range) * height}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className={cn("w-full", className)} style={{ height }}>
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Horizontal severity distribution bar (stacked). */
export function SeverityBar({ counts }: { counts: Partial<Record<RiskLevel, number>> }) {
  const order: RiskLevel[] = ["critical", "high", "medium", "low"];
  const total = order.reduce((s, l) => s + (counts[l] ?? 0), 0) || 1;
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-bg-subtle">
      {order.map((l) => {
        const v = counts[l] ?? 0;
        if (!v) return null;
        return <div key={l} style={{ width: `${(v / total) * 100}%`, background: RISK_HEX[l] }} />;
      })}
    </div>
  );
}

/** Stat tile with an optional trend delta + sparkline. */
export function MetricTile({
  label,
  value,
  delta,
  deltaGood,
  spark,
  icon,
}: {
  label: string;
  value: ReactNode;
  delta?: string;
  deltaGood?: boolean;
  spark?: number[];
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-bg-elevated/60 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
        {icon}
      </div>
      <div className="mt-1 flex items-end justify-between gap-2">
        <span className="text-2xl font-semibold text-white">{value}</span>
        {delta && (
          <span className={cn("text-xs font-semibold", deltaGood ? "text-risk-low" : "text-risk-high")}>
            {delta}
          </span>
        )}
      </div>
      {spark && spark.length > 1 && <Sparkline values={spark} className="mt-2" />}
    </div>
  );
}
