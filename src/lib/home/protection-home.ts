/**
 * Protection Home — the autonomous, outcome-first view model.
 *
 * The customer's default face. It composes the operator engines the platform
 * already runs — risk scoring, broker removals, agent workflows, threat
 * detection, recommendations — into four plain-language zones:
 *
 *   ① Status      — one protection score + a human sentence
 *   ② Doing       — what the platform is autonomously handling right now
 *   ③ Needs you   — the short list only a human can approve
 *   ④ Found       — the exposure mirror
 *
 * Pure and unit-tested. The operator surfaces stay where they are; this hides
 * them behind outcomes, so the customer approves rather than operates.
 */

import type { RiskLevel, RemovalRequest, Recommendation, Threat, RiskScore } from "@/lib/types";
import type { Workflow } from "@/lib/agents/workflows";
import { needsApproval, type AutonomyMode } from "./autonomy";

const RISK_RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };

export type ProtectionBand = "exposed" | "fair" | "protected" | "secure";

export interface ProtectionAction {
  kind: "removal" | "workflow" | "reputation" | "monitoring";
  label: string;
  detail: string;
}

export interface NeedItem {
  id: string;
  title: string;
  why: string;
  riskLevel: RiskLevel;
  actionLabel: string;
}

export interface FoundSummary {
  total: number;
  exposures: number;
  threats: number;
  removalsInFlight: number;
  removed: number;
  topConcern: string | null;
}

export interface ProtectionHome {
  /** 0–100, higher = more protected (the inverse of overall risk). */
  protectionScore: number;
  band: ProtectionBand;
  headline: string;
  /** Protection trend (higher = better), oldest → newest. */
  trend: { date: string; score: number }[];
  /** Change vs the start of the trend window. */
  delta: number;
  doing: ProtectionAction[];
  needsYou: NeedItem[];
  found: FoundSummary;
  /** The active autonomy mode. */
  mode: AutonomyMode;
  /** Recommendations auto-handled under the current mode (not surfaced to the user). */
  autoHandled: number;
}

export interface ProtectionHomeInput {
  riskScore: RiskScore;
  exposures: { length: number };
  threats: Threat[];
  recommendations: Recommendation[];
  removals: RemovalRequest[];
  workflows: Workflow[];
  /** How hands-on the customer chose to be; defaults to advisor (surface everything). */
  mode?: AutonomyMode;
}

function bandFor(score: number): ProtectionBand {
  if (score >= 85) return "secure";
  if (score >= 70) return "protected";
  if (score >= 50) return "fair";
  return "exposed";
}

const REMOVAL_ACTIVE = new Set(["removal_requested", "in_progress"]);

function headlineFor(band: ProtectionBand, doingCount: number, foundTotal: number): string {
  switch (band) {
    case "secure":
      return doingCount > 0
        ? `You're secure. We're keeping ${doingCount} protection${doingCount === 1 ? "" : "s"} running for you.`
        : `You're secure. Everything is being monitored.`;
    case "protected":
      return `You're protected. We're handling ${doingCount} thing${doingCount === 1 ? "" : "s"} for you.`;
    case "fair":
      return `You're getting safer. We're actively working through ${foundTotal} exposure${foundTotal === 1 ? "" : "s"}.`;
    default:
      return `Let's lock this down — we found ${foundTotal} exposure${foundTotal === 1 ? "" : "s"} and we're already on it.`;
  }
}

/** Compose the autonomous "what we're doing for you" list from live engine state. */
function buildDoing(input: ProtectionHomeInput): ProtectionAction[] {
  const out: ProtectionAction[] = [];

  const inFlight = input.removals.filter((r) => REMOVAL_ACTIVE.has(r.status)).length;
  if (inFlight > 0) {
    out.push({
      kind: "removal",
      label: `Removing ${inFlight} listing${inFlight === 1 ? "" : "s"} from data brokers`,
      detail: "Opt-out & suppression requests in progress",
    });
  }

  const active = input.workflows.filter((w) => w.status === "running" || w.status === "complete").length;
  if (active > 0) {
    out.push({
      kind: "workflow",
      label: `Running ${active} automated protection${active === 1 ? "" : "s"}`,
      detail: "Multi-agent responses to your detections",
    });
  }

  const repThreat = input.threats.some((t) => t.kind === "negative_press" && !t.acknowledged);
  if (repThreat) {
    out.push({
      kind: "reputation",
      label: "Recovering your search results & reputation",
      detail: "Suppressing negatives, promoting owned content",
    });
  }

  // Always-on monitoring — the baseline promise.
  out.push({
    kind: "monitoring",
    label: "Monitoring the dark web, breaches & brokers 24/7",
    detail: "We watch continuously and act the moment something surfaces",
  });

  return out;
}

/**
 * The only human-in-the-loop queue: blocked workflows + the recommendations the
 * chosen autonomy mode says the human must still approve. Lower-risk items are
 * auto-handled (and counted separately). Returns the queue + the auto-handled count.
 */
function buildNeedsYou(input: ProtectionHomeInput, mode: AutonomyMode, limit = 4): { items: NeedItem[]; autoHandled: number } {
  const items: NeedItem[] = [];

  // Workflows already gated for approval always need the human.
  for (const w of input.workflows) {
    if (w.status === "awaiting_approval" || w.status === "escalated") {
      items.push({
        id: `wf-${w.id}`,
        title: `Approve: ${w.name}`,
        why: "A protection step needs your sign-off before it runs.",
        riskLevel: w.status === "escalated" ? "high" : "medium",
        actionLabel: "Review",
      });
    }
  }

  let autoHandled = 0;
  const recs = [...input.recommendations]
    .sort((a, b) => RISK_RANK[b.riskLevel] - RISK_RANK[a.riskLevel] || b.impact - a.impact);
  for (const r of recs) {
    if (!needsApproval(r.riskLevel, mode)) { autoHandled += 1; continue; }
    items.push({
      id: `rec-${r.id}`,
      title: r.title,
      why: r.rationale,
      riskLevel: r.riskLevel,
      actionLabel: r.actionLabel,
    });
  }

  return {
    items: items.sort((a, b) => RISK_RANK[b.riskLevel] - RISK_RANK[a.riskLevel]).slice(0, limit),
    autoHandled,
  };
}

function buildFound(input: ProtectionHomeInput): FoundSummary {
  const activeThreats = input.threats.filter((t) => !t.acknowledged);
  const removalsInFlight = input.removals.filter((r) => REMOVAL_ACTIVE.has(r.status)).length;
  const removed = input.removals.filter((r) => r.status === "removed").length;

  const worst = [...activeThreats].sort((a, b) => RISK_RANK[b.riskLevel] - RISK_RANK[a.riskLevel])[0];
  return {
    total: input.exposures.length + activeThreats.length,
    exposures: input.exposures.length,
    threats: activeThreats.length,
    removalsInFlight,
    removed,
    topConcern: worst ? worst.title : null,
  };
}

/** Build the full Protection Home view model from current engine state. */
export function buildProtectionHome(input: ProtectionHomeInput): ProtectionHome {
  const protectionScore = Math.max(0, Math.min(100, Math.round(100 - input.riskScore.overall)));
  const band = bandFor(protectionScore);

  const trend = (input.riskScore.trend ?? []).map((t) => ({
    date: t.date,
    score: Math.max(0, Math.min(100, Math.round(100 - t.overall))),
  }));
  const delta = trend.length > 1 ? trend[trend.length - 1].score - trend[0].score : 0;

  const mode: AutonomyMode = input.mode ?? "advisor";
  const doing = buildDoing(input);
  const { items: needsYou, autoHandled } = buildNeedsYou(input, mode);
  const found = buildFound(input);

  // When the platform is auto-resolving items, say so — it reinforces the autonomy.
  if (autoHandled > 0) {
    doing.unshift({
      kind: "workflow",
      label: `Auto-resolving ${autoHandled} recommendation${autoHandled === 1 ? "" : "s"} for you`,
      detail: "Handled automatically under your protection settings",
    });
  }

  const headline = headlineFor(band, doing.length, found.total);

  return { protectionScore, band, headline, trend, delta, doing, needsYou, found, mode, autoHandled };
}
