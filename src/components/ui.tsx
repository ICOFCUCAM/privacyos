import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn, riskBg, titleCase } from "@/lib/ui";
import type { RiskLevel } from "@/lib/types";

/** Consistent page header: optional icon, title, subtitle and an actions slot. */
export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  actions,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        {Icon && <Icon className="h-7 w-7 shrink-0 text-brand" />}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-bg-elevated/60 p-5 backdrop-blur",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        riskBg[level],
      )}
    >
      {titleCase(level)}
    </span>
  );
}

export function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md bg-bg-subtle px-2 py-0.5 text-xs font-medium text-slate-300 ring-1 ring-border">
      {children}
    </span>
  );
}

/**
 * Honest data-provenance badge. Live = data from Supabase for this user; Sample
 * = the built-in demonstration dataset (not collected from real sources yet).
 */
export function DataBadge({ live }: { live: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1",
        live
          ? "bg-risk-low/10 text-risk-low ring-risk-low/30"
          : "bg-risk-medium/10 text-risk-medium ring-risk-medium/30",
      )}
      title={
        live
          ? "Live data from your account"
          : "Sample data — illustrative dataset, not collected from real sources yet"
      }
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", live ? "bg-risk-low" : "bg-risk-medium")} />
      {live ? "Live data" : "Sample data"}
    </span>
  );
}

export function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: string;
}) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <span className={cn("text-2xl font-semibold text-white", accent)}>{value}</span>
      {hint && <span className="text-xs text-slate-500">{hint}</span>}
    </Card>
  );
}

/** Circular gauge for a 0–100 score (higher = worse exposure). */
export function ScoreGauge({ score }: { score: number }) {
  const radius = 52;
  const circ = 2 * Math.PI * radius;
  const dash = (score / 100) * circ;
  const color =
    score >= 75 ? "#ef4444" : score >= 50 ? "#f97316" : score >= 25 ? "#eab308" : "#22c55e";
  return (
    <div className="relative h-36 w-36">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#1f2430" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-white">{score}</span>
        <span className="text-xs text-slate-400">exposure</span>
      </div>
    </div>
  );
}

/** Horizontal labelled bar for an axis score. */
export function AxisBar({ label, value }: { label: string; value: number }) {
  const color =
    value >= 75 ? "bg-risk-critical" : value >= 50 ? "bg-risk-high" : value >= 25 ? "bg-risk-medium" : "bg-risk-low";
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-xs text-slate-400">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg-subtle">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${value}%` }} />
      </div>
      <span className="w-8 shrink-0 text-right text-xs font-medium text-slate-300">{value}</span>
    </div>
  );
}

/** Simple responsive line chart for a numeric series that may go negative. */
export function LineChart({
  values,
  height = 80,
  color = "#6366f1",
}: {
  values: number[];
  height?: number;
  color?: string;
}) {
  if (values.length === 0) return null;
  const w = 100;
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const range = max - min || 1;
  const stepX = w / Math.max(values.length - 1, 1);
  const y = (v: number) => height - ((v - min) / range) * height;
  const points = values.map((v, i) => `${i * stepX},${y(v)}`).join(" ");
  const zeroY = y(0);
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="h-20 w-full">
      <line x1="0" y1={zeroY} x2={w} y2={zeroY} stroke="#1f2430" strokeWidth="0.5" />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** Stacked sentiment bars (positive / neutral / negative) per day. */
export function SentimentBars({
  days,
}: {
  days: { positive: number; neutral: number; negative: number }[];
}) {
  return (
    <div className="flex h-20 items-end gap-1">
      {days.map((d, i) => {
        const total = d.positive + d.neutral + d.negative || 1;
        return (
          <div key={i} className="flex h-full flex-1 flex-col justify-end overflow-hidden rounded-sm">
            <div className="bg-risk-critical/70" style={{ height: `${(d.negative / total) * 100}%` }} />
            <div className="bg-slate-600" style={{ height: `${(d.neutral / total) * 100}%` }} />
            <div className="bg-risk-low/70" style={{ height: `${(d.positive / total) * 100}%` }} />
          </div>
        );
      })}
    </div>
  );
}
