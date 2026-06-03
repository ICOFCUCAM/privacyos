/**
 * Hero metrics — the outcome numbers the floating dashboard renders.
 *
 * On the public homepage there is no signed-in customer, so we render a
 * representative "demo mode": deterministic-but-non-round figures that drift
 * day to day so they feel live, never obviously fake. When real platform
 * metrics are available they can be passed straight in via `HeroMetrics`.
 */

export type ActionTone = "low" | "medium" | "brand";

export interface HeroAction {
  label: string;
  detail: string;
  tone: ActionTone;
  ago: string;
}

export interface HeroMetrics {
  protectionScore: number;
  exposuresRemoved: number;
  threatsPrevented: number;
  familyProtected: number;
  agentsActive: number;
  /** 7 normalized points (0–1) for the protection-activity chart. */
  chart: number[];
  actions: HeroAction[];
}

function seeded(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export function demoHeroMetrics(now: Date = new Date()): HeroMetrics {
  const day = Math.floor(now.getTime() / 86_400_000);
  const r = (i: number) => seeded(day + i);

  const chart = Array.from({ length: 7 }, (_, i) => 0.35 + seeded(day - i) * 0.6);

  return {
    protectionScore: 92 + Math.round(r(7) * 6), // 92–98
    exposuresRemoved: 1180 + Math.round(r(1) * 260),
    threatsPrevented: 280 + Math.round(r(2) * 90),
    familyProtected: 4 + Math.round(r(3) * 2), // 4–6
    agentsActive: 13,
    chart,
    actions: [
      { label: "Identity secured", detail: "Digital identity", tone: "brand", ago: "just now" },
      { label: "Broker removal completed", detail: "Spokeo", tone: "low", ago: "6m ago" },
      { label: "Threat neutralized", detail: "Dark web", tone: "medium", ago: "22m ago" },
      { label: "Exposure removed", detail: "People-search", tone: "low", ago: "1h ago" },
      { label: "Reputation risk reduced", detail: "Search results", tone: "brand", ago: "2h ago" },
    ],
  };
}
