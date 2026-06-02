/**
 * Activation analytics — the funnel for the Scary Mirror → consent → protect
 * flow. Instruments the two numbers that matter most for the autonomous
 * product: **time-to-first-finding** (how fast the scary mirror lands) and the
 * **consent conversion** (how many who see the reveal actually authorize
 * protection). Pure and unit-tested; events are emitted from the scan flow and
 * land in the audit log, then roll up through `activationFunnel`.
 */

export type ActivationStage = "scan" | "revealed" | "consent_viewed" | "activated";

export interface ActivationEvent {
  stage: ActivationStage;
  /** Epoch ms. */
  at: number;
  /** Time from scan start to the reveal (ms) — set on "revealed". */
  ttffMs?: number;
  /** Findings shown — set on "revealed". */
  findings?: number;
  /** Chosen autonomy mode — set on "activated". */
  mode?: string;
}

export interface ActivationFunnel {
  scans: number;
  revealed: number;
  consentViewed: number;
  activated: number;
  /** revealed ÷ scans, 0–100. */
  revealRate: number;
  /** activated ÷ revealed, 0–100 — the consent conversion. */
  consentRate: number;
  /** activated ÷ scans, 0–100 — end-to-end activation. */
  activationRate: number;
  /** Median time-to-first-finding (ms) across revealed events. */
  ttffMedianMs: number;
  /** 90th-percentile time-to-first-finding (ms). */
  ttffP90Ms: number;
}

function pct(num: number, den: number): number {
  return den === 0 ? 0 : Math.round((num / den) * 100);
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

export function activationFunnel(events: ActivationEvent[]): ActivationFunnel {
  const count = (s: ActivationStage) => events.filter((e) => e.stage === s).length;
  const scans = count("scan");
  const revealed = count("revealed");
  const consentViewed = count("consent_viewed");
  const activated = count("activated");

  const ttffs = events
    .filter((e) => e.stage === "revealed" && typeof e.ttffMs === "number")
    .map((e) => e.ttffMs as number)
    .sort((a, b) => a - b);
  const median = ttffs.length === 0 ? 0 : ttffs[Math.floor((ttffs.length - 1) / 2)];

  return {
    scans,
    revealed,
    consentViewed,
    activated,
    revealRate: pct(revealed, scans),
    consentRate: pct(activated, revealed),
    activationRate: pct(activated, scans),
    ttffMedianMs: median,
    ttffP90Ms: percentile(ttffs, 90),
  };
}
