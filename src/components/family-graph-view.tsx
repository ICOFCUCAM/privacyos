/**
 * Radial family-graph visualization (server component, pure SVG).
 *
 * The principal sits at the centre; each relative is a node placed around a
 * ring, sized and coloured by combined risk, connected by an edge whose weight
 * reflects the household risk propagated to them.
 */

export interface FamilyGraphNode {
  id: string;
  name: string;
  relationLabel: string;
  risk: number;
  inherited: number;
  isMinor: boolean;
}

function riskColor(score: number): string {
  if (score >= 75) return "#ef4444";
  if (score >= 50) return "#f97316";
  if (score >= 25) return "#eab308";
  return "#22c55e";
}

export function FamilyGraphView({ principal, nodes }: { principal: string; nodes: FamilyGraphNode[] }) {
  const W = 340;
  const H = 240;
  const cx = W / 2;
  const cy = H / 2;
  const R = Math.min(W, H) / 2 - 46;
  const n = Math.max(nodes.length, 1);

  const placed = nodes.map((node, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return { ...node, x: cx + R * Math.cos(angle), y: cy + R * Math.sin(angle) };
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Family relationship and risk-propagation graph">
      {/* edges */}
      {placed.map((p) => {
        const propagating = p.inherited > 0;
        return (
          <line
            key={`e-${p.id}`}
            x1={cx} y1={cy} x2={p.x} y2={p.y}
            stroke={propagating ? riskColor(p.risk) : "#334155"}
            strokeWidth={propagating ? 1 + Math.min(p.inherited / 18, 3) : 1}
            strokeOpacity={propagating ? 0.5 : 0.3}
            strokeDasharray={propagating ? undefined : "3 3"}
          />
        );
      })}

      {/* member nodes */}
      {placed.map((p) => {
        const r = 11 + Math.min(p.risk / 9, 9);
        return (
          <g key={`n-${p.id}`}>
            <circle cx={p.x} cy={p.y} r={r} fill={riskColor(p.risk)} fillOpacity={0.18} stroke={riskColor(p.risk)} strokeWidth={1.5} />
            <text x={p.x} y={p.y + 3.5} textAnchor="middle" fontSize="10" fontWeight="700" fill="#e2e8f0">{p.risk}</text>
            <text x={p.x} y={p.y + r + 11} textAnchor="middle" fontSize="8.5" fill="#94a3b8">
              {p.name.length > 14 ? `${p.name.slice(0, 13)}…` : p.name}{p.isMinor ? " ▾" : ""}
            </text>
          </g>
        );
      })}

      {/* principal */}
      <circle cx={cx} cy={cy} r={20} fill="#6366f1" fillOpacity={0.25} stroke="#818cf8" strokeWidth={2} />
      <text x={cx} y={cy + 3.5} textAnchor="middle" fontSize="9" fontWeight="700" fill="#e0e7ff">
        {principal.split(" ").map((w) => w[0]).join("").slice(0, 3).toUpperCase()}
      </text>
      <text x={cx} y={cy + 34} textAnchor="middle" fontSize="8.5" fill="#a5b4fc">principal</text>
    </svg>
  );
}
