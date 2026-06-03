/**
 * Hero metrics — the outcome numbers the floating dashboard renders.
 *
 * Public homepage has no signed-in customer, so this is a representative "demo
 * mode": deterministic-but-non-round figures that drift daily so they read live,
 * never obviously fake. Real platform metrics can be passed straight in.
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
  threatsBlocked: number;
  familyProtected: number;
  /** Normalized, upward-trending series (0–1) for the flowing activity line. */
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

  // Upward-trending protection-activity line with gentle variance.
  const chart = Array.from({ length: 14 }, (_, i) => {
    const trend = 0.3 + (i / 13) * 0.55;
    return Math.min(1, Math.max(0.12, trend + (seeded(day * 2 + i) - 0.5) * 0.18));
  });

  return {
    protectionScore: 92 + Math.round(r(7) * 6), // 92–98
    exposuresRemoved: 1180 + Math.round(r(1) * 260),
    threatsBlocked: 280 + Math.round(r(2) * 90),
    familyProtected: 4 + Math.round(r(3) * 2),
    chart,
    actions: [
      { label: "Identity secured", detail: "Digital identity", tone: "brand", ago: "just now" },
      { label: "Broker removal completed", detail: "Spokeo", tone: "low", ago: "6m ago" },
      { label: "Threat blocked", detail: "Dark web", tone: "medium", ago: "22m ago" },
      { label: "Exposure removed", detail: "People-search", tone: "low", ago: "1h ago" },
    ],
  };
}
