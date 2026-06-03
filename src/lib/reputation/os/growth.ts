/**
 * ReputationOS — growth layer.
 *
 * Turns the analysis picture into a proactive growth program: content
 * recommendations, a content calendar, posting cadence per platform, personal-
 * brand strategy pillars and executive-visibility tracking. Pure and
 * unit-tested; deterministic from the subject + mention profile.
 */

import type { Subject } from "@/lib/types";
import type { Mention } from "@/lib/suite-types";
import { analysisScores } from "./analysis";

export type ContentFormat = "article" | "post" | "video" | "interview" | "thread";

export interface ContentRecommendation {
  title: string;
  format: ContentFormat;
  channel: string;
  rationale: string;
  /** Estimated reputation lift, 0–100 relative. */
  impact: number;
}

export interface CalendarEntry {
  day: number; // days from now
  title: string;
  format: ContentFormat;
  channel: string;
}

export interface PostingSuggestion {
  platform: string;
  cadence: string;
  bestTime: string;
  focus: string;
}

export interface BrandPillar {
  pillar: string;
  description: string;
}

export interface ExecutiveVisibility {
  score: number;
  trajectory: "rising" | "steady" | "declining";
  /** Gaps holding visibility back. */
  gaps: string[];
}

export interface GrowthProgram {
  recommendations: ContentRecommendation[];
  calendar: CalendarEntry[];
  posting: PostingSuggestion[];
  pillars: BrandPillar[];
  visibility: ExecutiveVisibility;
}

function firstName(subject: Subject): string {
  return subject.displayName.split(" ")[0] || subject.displayName;
}

export function contentRecommendations(subject: Subject, mentions: Mention[]): ContentRecommendation[] {
  const s = analysisScores(mentions);
  const name = subject.displayName;
  const recs: ContentRecommendation[] = [
    { title: `Thought-leadership essay under ${name}'s byline`, format: "article", channel: "Owned blog + LinkedIn", rationale: "Authoritative owned content reclaims page-one search and frames the narrative.", impact: 90 },
    { title: `Founder POV thread on an industry trend`, format: "thread", channel: "X", rationale: "High-frequency social presence lifts reach and influence.", impact: 70 },
    { title: `Short explainer video answering a common question`, format: "video", channel: "YouTube + Instagram", rationale: "Video ranks well and humanizes the principal.", impact: 78 },
  ];
  // If sentiment is soft, prioritize credibility content.
  if (s.sentiment < 55) {
    recs.unshift({ title: `Customer/peer success story`, format: "interview", channel: "Press + owned", rationale: "Third-party validation counters soft sentiment.", impact: 85 });
  }
  return recs.sort((a, b) => b.impact - a.impact);
}

const FORMAT_BY_SLOT: ContentFormat[] = ["article", "post", "thread", "video", "post", "interview", "post"];
const CHANNEL_BY_SLOT = ["LinkedIn", "X", "X", "YouTube", "Instagram", "Press", "LinkedIn"];

export function contentCalendar(subject: Subject, days = 14): CalendarEntry[] {
  const name = firstName(subject);
  const entries: CalendarEntry[] = [];
  for (let i = 0; i < days; i += 2) {
    const slot = (i / 2) % FORMAT_BY_SLOT.length;
    entries.push({
      day: i + 1,
      title: `${name}: ${["industry insight", "behind-the-scenes", "hot take", "explainer", "milestone", "Q&A", "lesson learned"][slot]}`,
      format: FORMAT_BY_SLOT[slot],
      channel: CHANNEL_BY_SLOT[slot],
    });
  }
  return entries;
}

export function postingSuggestions(): PostingSuggestion[] {
  return [
    { platform: "LinkedIn", cadence: "3×/week", bestTime: "Tue–Thu, 8–10am", focus: "Authority & thought leadership" },
    { platform: "X", cadence: "Daily", bestTime: "Weekdays, 12–1pm", focus: "Reach & real-time commentary" },
    { platform: "Instagram", cadence: "2×/week", bestTime: "Mon/Wed, 6–8pm", focus: "Humanize the brand" },
    { platform: "YouTube", cadence: "Bi-weekly", bestTime: "Thu, 5pm", focus: "Depth & searchability" },
  ];
}

export function brandPillars(subject: Subject): BrandPillar[] {
  const role = subject.organization ? `at ${subject.organization}` : "in the industry";
  return [
    { pillar: "Authority", description: `Position ${firstName(subject)} as a go-to expert ${role}.` },
    { pillar: "Vision", description: "Share a forward-looking POV that competitors don't own." },
    { pillar: "Credibility", description: "Surface third-party proof — press, results, testimonials." },
    { pillar: "Humanity", description: "Show values and the person behind the title." },
  ];
}

export function executiveVisibility(mentions: Mention[]): ExecutiveVisibility {
  const s = analysisScores(mentions);
  const score = Math.round(s.reach * 0.5 + s.authority * 0.3 + s.influence * 0.2);
  const positives = mentions.filter((m) => m.sentiment === "positive").length;
  const recents = mentions.filter((m) => Date.now() - new Date(m.detectedAt).getTime() < 7 * 86_400_000).length;
  const trajectory = recents >= 2 && positives >= recents / 2 ? "rising" : recents === 0 ? "declining" : "steady";
  const gaps: string[] = [];
  if (s.reach < 60) gaps.push("Thin channel footprint — expand to video and owned media.");
  if (s.authority < 65) gaps.push("Limited tier-1 press — pursue earned media.");
  if (positives < 2) gaps.push("Few positive signals — increase publishing cadence.");
  if (gaps.length === 0) gaps.push("Maintain momentum with a consistent calendar.");
  return { score, trajectory, gaps };
}

export function growthProgram(subject: Subject, mentions: Mention[]): GrowthProgram {
  return {
    recommendations: contentRecommendations(subject, mentions),
    calendar: contentCalendar(subject),
    posting: postingSuggestions(),
    pillars: brandPillars(subject),
    visibility: executiveVisibility(mentions),
  };
}
