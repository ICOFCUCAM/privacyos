/**
 * ReputationOS — recovery layer.
 *
 * Defensive playbooks: negative-content suppression plans, a reputation-repair
 * workflow and a severity-tiered crisis-communications workflow. Pure and
 * unit-tested; derived from the negative/defamatory mentions in the profile.
 */

import type { Mention } from "@/lib/suite-types";
import type { SerpResult } from "./serp-connector";

export interface SuppressionTarget {
  title: string;
  source: string;
  currentRank: number | null;
  defamatory: boolean;
  tactics: string[];
  /** Projected rank after suppression (higher number = pushed down). */
  projectedRank: number;
  /** True when currentRank is a real live SERP position (not modeled). */
  liveRank: boolean;
}

export interface WorkflowStep {
  step: number;
  action: string;
  owner: string;
}

export type CrisisTier = "monitor" | "contain" | "full_response";

export interface CrisisPlan {
  tier: CrisisTier;
  trigger: string;
  steps: WorkflowStep[];
}

export interface RecoveryProgram {
  suppression: SuppressionTarget[];
  repair: WorkflowStep[];
  crisis: CrisisPlan;
}

/** The suppression tactics applied to a negative vs. defamatory asset. */
export function suppressionTactics(defamatory: boolean): string[] {
  return defamatory
    ? ["Legal takedown / right-to-be-forgotten", "Counter-publish authoritative owned content", "Request de-indexing"]
    : ["Publish higher-authority owned content", "Earn positive press to outrank", "Build backlinks to positive assets"];
}

/** The real live SERP position of a mention, by URL domain — or null. */
function liveRankFor(m: Mention, serpResults: SerpResult[]): number | null {
  if (!m.url || serpResults.length === 0) return null;
  try {
    const domain = new URL(m.url).hostname.replace(/^www\./, "");
    const hit = serpResults.find((r) => r.domain === domain);
    return hit ? hit.position : null;
  } catch {
    return null;
  }
}

/**
 * Build the suppression plan. When live SERP results are supplied, a negative
 * asset's current rank is its real page-one position (and the projection is
 * derived from it); otherwise it falls back to the mention's modeled rank.
 */
export function suppressionPlan(mentions: Mention[], serpResults: SerpResult[] = []): SuppressionTarget[] {
  return mentions
    .filter((m) => m.sentiment === "negative" || m.isDefamatory)
    .map((m) => {
      const tactics = suppressionTactics(m.isDefamatory);
      const live = liveRankFor(m, serpResults);
      const current = live ?? m.searchRank ?? null;
      const projectedRank = Math.min(20, (current ?? 10) + (m.isDefamatory ? 9 : 6));
      return { title: m.title, source: m.sourceName, currentRank: current, defamatory: m.isDefamatory, tactics, projectedRank, liveRank: live !== null };
    })
    .sort((a, b) => (a.currentRank ?? 99) - (b.currentRank ?? 99));
}

export function repairWorkflow(): WorkflowStep[] {
  return [
    { step: 1, action: "Audit page-one results & catalog negative assets", owner: "Reputation Agent" },
    { step: 2, action: "Publish & optimize authoritative owned profiles", owner: "Reputation Agent" },
    { step: 3, action: "Escalate defamatory items to the Legal engine", owner: "Legal Agent" },
    { step: 4, action: "Earn positive press to dilute negatives", owner: "Media workflow" },
    { step: 5, action: "Monitor rank movement & re-suppress as needed", owner: "Reputation Agent" },
  ];
}

/** Choose a crisis tier from the volume/severity of negative signal. */
export function crisisPlan(mentions: Mention[]): CrisisPlan {
  const negatives = mentions.filter((m) => m.sentiment === "negative").length;
  const defamation = mentions.filter((m) => m.isDefamatory).length;
  const viral = mentions.some((m) => m.channel === "social" && m.sentiment === "negative");

  let tier: CrisisTier;
  let trigger: string;
  if (defamation > 0 || (negatives >= 3 && viral)) {
    tier = "full_response";
    trigger = defamation > 0 ? "Defamatory content detected" : "High-volume negative + viral social";
  } else if (negatives >= 1 && viral) {
    tier = "contain";
    trigger = "Negative social momentum building";
  } else {
    tier = "monitor";
    trigger = "No active crisis — standing watch";
  }

  const steps: Record<CrisisTier, WorkflowStep[]> = {
    monitor: [
      { step: 1, action: "Keep real-time alerts on the principal's name", owner: "Reputation Agent" },
      { step: 2, action: "Pre-stage holding statements", owner: "Comms" },
    ],
    contain: [
      { step: 1, action: "Assess scope & sentiment velocity", owner: "Reputation Agent" },
      { step: 2, action: "Engage selectively; avoid amplification", owner: "Comms" },
      { step: 3, action: "Publish a measured clarification on owned channels", owner: "Comms" },
      { step: 4, action: "Brief the principal & stakeholders", owner: "Exec liaison" },
    ],
    full_response: [
      { step: 1, action: "Activate the crisis team & single source of truth", owner: "Incident Agent" },
      { step: 2, action: "Issue an official statement across all channels", owner: "Comms" },
      { step: 3, action: "File legal takedowns for defamatory content", owner: "Legal Agent" },
      { step: 4, action: "Coordinate friendly press & third-party validators", owner: "Media workflow" },
      { step: 5, action: "Track sentiment recovery & report hourly", owner: "Reputation Agent" },
    ],
  };

  return { tier, trigger, steps: steps[tier] };
}

export function recoveryProgram(mentions: Mention[], serpResults: SerpResult[] = []): RecoveryProgram {
  return { suppression: suppressionPlan(mentions, serpResults), repair: repairWorkflow(), crisis: crisisPlan(mentions) };
}
