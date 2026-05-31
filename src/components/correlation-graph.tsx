import { cn } from "@/lib/ui";
import type { RiskLevel } from "@/lib/types";
import type { CorrelationGraph } from "@/lib/intelligence/correlation";

const RISK_HEX: Record<RiskLevel, string> = {
  low: "#22c55e",
  medium: "#eab308",
  high: "#f97316",
  critical: "#ef4444",
};

/**
 * Radial node-link rendering of the threat-correlation graph: the subject at the
 * center, sources fanned across the top arc and categories across the bottom,
 * with edge thickness/color encoding exposure weight and severity. Pure SVG, no
 * dependencies — readable in a dense Command Center card.
 */
export function CorrelationGraphView({ graph, size = 380 }: { graph: CorrelationGraph; size?: number }) {
  // Flatten into a wide ellipse: full horizontal radius, compressed vertical, so
  // the canvas height is ~68% of its width — removing the empty top/bottom bands
  // a square layout leaves while keeping every node and label visible.
  const width = size;
  const height = Math.round(size * 0.68);
  const cx = width / 2;
  const cy = height / 2;
  const rx = width / 2 - 46;
  const ry = height / 2 - 26;
  const subject = graph.nodes.find((n) => n.kind === "subject");
  const sources = graph.nodes.filter((n) => n.kind === "source");
  const categories = graph.nodes.filter((n) => n.kind === "category");
  const maxWeight = Math.max(1, ...graph.nodes.filter((n) => n.kind !== "subject").map((n) => n.weight));

  // Place sources on the top semicircle, categories on the bottom semicircle.
  function place(list: typeof sources, fromAngle: number, toAngle: number) {
    return list.map((node, i) => {
      const t = list.length === 1 ? 0.5 : i / (list.length - 1);
      const angle = fromAngle + (toAngle - fromAngle) * t;
      return {
        node,
        x: cx + Math.cos(angle) * rx,
        y: cy + Math.sin(angle) * ry,
      };
    });
  }
  const srcPts = place(sources, Math.PI * 1.15, Math.PI * 1.85); // upper arc
  const catPts = place(categories, Math.PI * 0.15, Math.PI * 0.85); // lower arc
  const positioned = [...srcPts, ...catPts];
  const posById = new Map(positioned.map((p) => [p.node.id, p]));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxWidth: width }} role="img" aria-label="Threat correlation graph">
      {/* edges */}
      {graph.edges.map((e, i) => {
        const p = posById.get(e.to);
        if (!p) return null;
        const w = 1 + (e.weight / maxWeight) * 3;
        return (
          <line
            key={i}
            x1={cx} y1={cy} x2={p.x} y2={p.y}
            stroke={RISK_HEX[e.level]}
            strokeOpacity={0.45}
            strokeWidth={w}
          />
        );
      })}

      {/* peripheral nodes */}
      {positioned.map((p) => {
        const nr = 5 + (p.node.weight / maxWeight) * 7;
        const labelOnLeft = p.x < cx;
        return (
          <g key={p.node.id}>
            <circle cx={p.x} cy={p.y} r={nr} fill={RISK_HEX[p.node.level]} fillOpacity={0.25} stroke={RISK_HEX[p.node.level]} strokeWidth={1.5} />
            <text
              x={labelOnLeft ? p.x - nr - 4 : p.x + nr + 4}
              y={p.y}
              textAnchor={labelOnLeft ? "end" : "start"}
              dominantBaseline="middle"
              className="fill-slate-300 text-[9px]"
            >
              {p.node.label}
              <tspan className="fill-slate-500"> · {p.node.weight}</tspan>
            </text>
          </g>
        );
      })}

      {/* subject hub */}
      {subject && (
        <>
          <circle cx={cx} cy={cy} r={22} fill={RISK_HEX[subject.level]} fillOpacity={0.18} stroke={RISK_HEX[subject.level]} strokeWidth={2} />
          <circle cx={cx} cy={cy} r={6} fill={RISK_HEX[subject.level]} />
          <text x={cx} y={cy + 36} textAnchor="middle" className="fill-white text-[10px] font-semibold">
            {subject.label}
          </text>
        </>
      )}
    </svg>
  );
}

/** Small legend for the correlation graph node kinds. */
export function CorrelationLegend() {
  const items: { level: RiskLevel; label: string }[] = [
    { level: "critical", label: "Critical" },
    { level: "high", label: "High" },
    { level: "medium", label: "Medium" },
    { level: "low", label: "Low" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {items.map((it) => (
        <span key={it.level} className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
          <span className={cn("h-2 w-2 rounded-full", `bg-risk-${it.level}`)} />
          {it.label}
        </span>
      ))}
    </div>
  );
}
