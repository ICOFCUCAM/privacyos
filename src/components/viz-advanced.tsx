import type { ReactNode } from "react";
import { cn } from "@/lib/ui";
import type { RiskLevel } from "@/lib/types";
import type { DayBucket, SurfaceAxis } from "@/lib/intelligence/command-center";

const RISK_HEX: Record<RiskLevel, string> = {
  low: "#22c55e",
  medium: "#eab308",
  high: "#f97316",
  critical: "#ef4444",
};

const STACK_ORDER: RiskLevel[] = ["low", "medium", "high", "critical"];

/* ── Stacked daily timeline (exposure / threat velocity over time) ───────── */

export function StackedTimeline({
  buckets,
  height = 120,
  ariaLabel,
}: {
  buckets: DayBucket[];
  height?: number;
  ariaLabel?: string;
}) {
  const max = Math.max(1, ...buckets.map((b) => b.total));
  const ticks = Math.max(1, Math.ceil(buckets.length / 6));
  return (
    <div role="img" aria-label={ariaLabel}>
      <div className="flex items-end gap-[3px]" style={{ height }}>
        {buckets.map((b, i) => (
          <div key={b.date} className="group relative flex h-full flex-1 flex-col justify-end">
            {b.total > 0 ? (
              <div className="flex w-full flex-col-reverse overflow-hidden rounded-sm">
                {STACK_ORDER.map((level) => {
                  const v = b.byLevel[level];
                  if (!v) return null;
                  return (
                    <div
                      key={level}
                      style={{ height: `${(v / max) * height}px`, background: RISK_HEX[level] }}
                      className="w-full"
                    />
                  );
                })}
              </div>
            ) : (
              <div className="h-[2px] w-full rounded-full bg-bg-subtle" />
            )}
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-bg-elevated px-2 py-1 text-[10px] text-slate-200 shadow-lg group-hover:block">
              {b.label}: {b.total}
            </div>
            {i % ticks === 0 && (
              <span className="mt-1 hidden text-center text-[9px] text-slate-600 sm:block">{b.label}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Smooth area chart with gridlines + axis labels ──────────────────────── */

export function AreaChart({
  values,
  labels,
  height = 160,
  color = "#6366f1",
  highlightLast = true,
}: {
  values: number[];
  labels?: string[];
  height?: number;
  color?: string;
  highlightLast?: boolean;
}) {
  if (values.length === 0) return null;
  const w = 600;
  const padY = 8;
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const range = max - min || 1;
  const stepX = w / Math.max(values.length - 1, 1);
  const y = (v: number) => padY + (height - padY * 2) * (1 - (v - min) / range);
  const pts = values.map((v, i) => `${i * stepX},${y(v)}`);
  const linePath = `M ${pts.join(" L ")}`;
  const areaPath = `M 0,${height} L ${pts.join(" L ")} L ${w},${height} Z`;
  const gid = `area-${color.replace("#", "")}`;
  const lastX = (values.length - 1) * stepX;
  const lastY = y(values[values.length - 1]);

  // up to 4 horizontal gridlines
  const gridYs = [0.25, 0.5, 0.75, 1].map((f) => padY + (height - padY * 2) * f);

  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {gridYs.map((gy, i) => (
        <line key={i} x1="0" y1={gy} x2={w} y2={gy} stroke="#1f2430" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      ))}
      <path d={areaPath} fill={`url(#${gid})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      {highlightLast && (
        <circle cx={lastX} cy={lastY} r="3.5" fill={color} stroke="#0a0b0f" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      )}
    </svg>
  );
}

/** Evenly-spaced x-axis labels for a series (renders below an AreaChart). */
export function AxisLabels({ labels, max = 6 }: { labels: string[]; max?: number }) {
  if (labels.length === 0) return null;
  const step = Math.max(1, Math.ceil(labels.length / max));
  const picked = labels.filter((_, i) => i % step === 0 || i === labels.length - 1);
  return (
    <div className="mt-1.5 flex justify-between text-[10px] text-slate-600">
      {picked.map((l, i) => (
        <span key={i}>{l}</span>
      ))}
    </div>
  );
}

/* ── Radar / attack-surface polygon ──────────────────────────────────────── */

export function RadarChart({
  axes,
  size = 240,
  color = "#ef4444",
}: {
  axes: SurfaceAxis[];
  size?: number;
  color?: string;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 28;
  const n = axes.length;
  const max = Math.max(1, ...axes.map((a) => a.count));
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const point = (i: number, frac: number) => ({
    x: cx + Math.cos(angle(i)) * r * frac,
    y: cy + Math.sin(angle(i)) * r * frac,
  });
  const rings = [0.25, 0.5, 0.75, 1];
  const dataPts = axes.map((a, i) => point(i, a.count / max || 0.001));
  const dataPath = dataPts.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full" style={{ maxWidth: size }} role="img" aria-label="Identity attack surface">
      {rings.map((ring, ri) => (
        <polygon
          key={ri}
          points={axes.map((_, i) => { const p = point(i, ring); return `${p.x},${p.y}`; }).join(" ")}
          fill="none"
          stroke="#1f2430"
          strokeWidth="1"
        />
      ))}
      {axes.map((_, i) => {
        const p = point(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#1f2430" strokeWidth="1" />;
      })}
      <polygon points={dataPath} fill={color} fillOpacity="0.18" stroke={color} strokeWidth="2" />
      {dataPts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={color} />
      ))}
      {axes.map((a, i) => {
        const p = point(i, 1.16);
        return (
          <text
            key={a.key}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-slate-400 text-[9px]"
          >
            {a.label}
          </text>
        );
      })}
    </svg>
  );
}

/* ── Horizontal ranked bars (exposure sources) ───────────────────────────── */

export function RankedBars({
  items,
}: {
  items: { label: string; count: number; percent: number; topLevel: RiskLevel; icon?: ReactNode }[];
}) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <ul className="space-y-2.5">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-3">
          <span className="flex w-32 shrink-0 items-center gap-2 text-xs text-slate-300">
            {it.icon}
            <span className="truncate">{it.label}</span>
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg-subtle">
            <div
              className="h-full rounded-full"
              style={{ width: `${(it.count / max) * 100}%`, background: RISK_HEX[it.topLevel] }}
            />
          </div>
          <span className="w-10 shrink-0 text-right text-xs font-semibold text-white">{it.count}</span>
          <span className="w-9 shrink-0 text-right text-[11px] text-slate-500">{it.percent}%</span>
        </li>
      ))}
    </ul>
  );
}

/* ── Remediation progress meter ──────────────────────────────────────────── */

export function ProgressMeter({
  percent,
  stages,
}: {
  percent: number;
  stages: { key: string; label: string; value: number; level: RiskLevel | "neutral" }[];
}) {
  const stageColor: Record<string, string> = {
    low: "text-risk-low",
    medium: "text-risk-medium",
    high: "text-risk-high",
    critical: "text-risk-critical",
    neutral: "text-slate-300",
  };
  return (
    <div>
      <div className="flex items-end justify-between">
        <span className="text-xs uppercase tracking-wide text-slate-400">Neutralized</span>
        <span className="text-2xl font-bold text-risk-low">{percent}%</span>
      </div>
      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-bg-subtle">
        <div
          className="h-full rounded-full bg-gradient-to-r from-risk-low to-emerald-400 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {stages.map((s) => (
          <div key={s.key} className="rounded-lg border border-border bg-bg-subtle/60 p-2.5 text-center">
            <p className={cn("text-lg font-bold", stageColor[s.level])}>{s.value}</p>
            <p className="mt-0.5 text-[10px] text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
