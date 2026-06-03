/**
 * ReputationOS — social layer.
 *
 * Per-platform brand strategy (LinkedIn, X, Facebook, Instagram, YouTube): the
 * objective, content mix, cadence and a priority tuned to the subject's current
 * reach. Pure and unit-tested.
 */

import type { Mention } from "@/lib/suite-types";
import { analysisScores } from "./analysis";

export type SocialPlatform = "LinkedIn" | "X" | "Facebook" | "Instagram" | "YouTube";

export interface PlatformStrategy {
  platform: SocialPlatform;
  objective: string;
  contentMix: string[];
  cadence: string;
  priority: "high" | "medium" | "low";
}

const STRATEGY: Record<SocialPlatform, Omit<PlatformStrategy, "priority">> = {
  LinkedIn: {
    platform: "LinkedIn",
    objective: "Establish authority & thought leadership",
    contentMix: ["Long-form insight", "Company milestones", "Industry commentary"],
    cadence: "3×/week",
  },
  X: {
    platform: "X",
    objective: "Maximize reach & real-time relevance",
    contentMix: ["Hot takes", "Threads", "Live commentary"],
    cadence: "Daily",
  },
  Facebook: {
    platform: "Facebook",
    objective: "Community & broad-audience trust",
    contentMix: ["Announcements", "Long-form updates", "Q&A"],
    cadence: "2×/week",
  },
  Instagram: {
    platform: "Instagram",
    objective: "Humanize the brand",
    contentMix: ["Behind-the-scenes", "Reels", "Carousels"],
    cadence: "2–3×/week",
  },
  YouTube: {
    platform: "YouTube",
    objective: "Depth, searchability & evergreen authority",
    contentMix: ["Explainers", "Interviews", "Keynotes"],
    cadence: "Bi-weekly",
  },
};

const ALL_PLATFORMS: SocialPlatform[] = ["LinkedIn", "X", "Facebook", "Instagram", "YouTube"];

// Where to lean first depends on the current reputation profile.
function priorityFor(platform: SocialPlatform, reach: number, authority: number): PlatformStrategy["priority"] {
  if (authority < 65 && (platform === "LinkedIn" || platform === "YouTube")) return "high";
  if (reach < 60 && (platform === "X" || platform === "Instagram")) return "high";
  if (platform === "Facebook") return "low";
  return "medium";
}

export function socialStrategies(mentions: Mention[]): PlatformStrategy[] {
  const { reach, authority } = analysisScores(mentions);
  const order = { high: 0, medium: 1, low: 2 } as const;
  return ALL_PLATFORMS
    .map((p) => ({ ...STRATEGY[p], priority: priorityFor(p, reach, authority) }))
    .sort((a, b) => order[a.priority] - order[b.priority]);
}
