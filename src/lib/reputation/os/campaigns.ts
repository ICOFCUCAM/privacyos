/**
 * ReputationOS — automation layer.
 *
 * Auto-generates end-to-end plans by composing the growth, media and recovery
 * engines into ready-to-run campaigns, PR plans and recovery plans. Pure and
 * unit-tested; deterministic from the subject + mention profile.
 */

import type { Subject } from "@/lib/types";
import type { Mention } from "@/lib/suite-types";
import { contentRecommendations, executiveVisibility } from "./growth";
import { pressOpportunities, outreachWorkflow } from "./media";
import { suppressionPlan, crisisPlan } from "./recovery";
import { analysisScores } from "./analysis";

export type CampaignKind = "growth" | "pr" | "recovery";

export interface CampaignStep {
  phase: string;
  action: string;
  channel: string;
}

export interface Campaign {
  kind: CampaignKind;
  name: string;
  goal: string;
  durationWeeks: number;
  /** Projected reputation-health lift (points). */
  projectedLift: number;
  steps: CampaignStep[];
}

export function generateGrowthCampaign(subject: Subject, mentions: Mention[]): Campaign {
  const recs = contentRecommendations(subject, mentions).slice(0, 3);
  const vis = executiveVisibility(mentions);
  return {
    kind: "growth",
    name: `${subject.displayName}: Visibility & Authority`,
    goal: "Grow reach and establish thought leadership",
    durationWeeks: 8,
    projectedLift: vis.trajectory === "rising" ? 10 : 16,
    steps: [
      { phase: "Week 1–2", action: recs[0]?.title ?? "Publish flagship owned content", channel: recs[0]?.channel ?? "Owned" },
      { phase: "Week 3–4", action: recs[1]?.title ?? "Ramp social cadence", channel: recs[1]?.channel ?? "Social" },
      { phase: "Week 5–6", action: "Land an earned-media feature", channel: "Press" },
      { phase: "Week 7–8", action: recs[2]?.title ?? "Publish video explainer", channel: recs[2]?.channel ?? "YouTube" },
    ],
  };
}

export function generatePRPlan(subject: Subject): Campaign {
  const ops = pressOpportunities(subject).slice(0, 3);
  const outreach = outreachWorkflow();
  return {
    kind: "pr",
    name: `${subject.displayName}: Earned-Media Push`,
    goal: "Secure tier-1 press coverage",
    durationWeeks: 4,
    projectedLift: 12,
    steps: [
      { phase: "Prep", action: "Generate press release & media list", channel: "Media engine" },
      { phase: "Pitch", action: `Pitch ${ops[0]?.outlet ?? "tier-1 outlet"}: ${ops[0]?.angle ?? "exclusive"}`, channel: "Email" },
      { phase: "Follow-up", action: outreach[3]?.action ?? "Follow up after 48h", channel: "Email" },
      { phase: "Amplify", action: "Amplify published coverage", channel: "Social" },
    ],
  };
}

export function generateRecoveryPlan(subject: Subject, mentions: Mention[]): Campaign {
  const targets = suppressionPlan(mentions);
  const crisis = crisisPlan(mentions);
  const s = analysisScores(mentions);
  return {
    kind: "recovery",
    name: `${subject.displayName}: Reputation Repair`,
    goal: targets.length > 0 ? "Suppress negatives and rebuild trust" : "Harden a healthy reputation",
    durationWeeks: 12,
    projectedLift: Math.min(30, targets.length * 6 + (100 - s.brandPerception) / 4),
    steps: [
      { phase: "Triage", action: `Catalog ${targets.length} negative asset(s) & page-one harm`, channel: "Reputation Agent" },
      { phase: "Legal", action: targets.some((t) => t.defamatory) ? "File takedowns for defamatory content" : "No defamatory items — skip", channel: "Legal Agent" },
      { phase: "Suppress", action: "Publish authoritative content to outrank negatives", channel: "Owned + Press" },
      { phase: "Crisis", action: `Crisis posture: ${crisis.tier.replace(/_/g, " ")}`, channel: "Comms" },
      { phase: "Monitor", action: "Track rank recovery & re-suppress", channel: "Reputation Agent" },
    ],
  };
}

export function generateAllCampaigns(subject: Subject, mentions: Mention[]): Campaign[] {
  return [
    generateGrowthCampaign(subject, mentions),
    generatePRPlan(subject),
    generateRecoveryPlan(subject, mentions),
  ];
}
