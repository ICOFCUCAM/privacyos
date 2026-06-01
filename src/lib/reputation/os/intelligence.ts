/**
 * ReputationOS — intelligence layer.
 *
 * Opportunity discovery: influencers to engage, partnerships, speaking slots and
 * podcast appearances — each scored for fit and explained. Pure and unit-tested;
 * deterministic from the subject's profile.
 */

import type { Subject } from "@/lib/types";
import type { PodcastResult } from "./podcast-connector";

export type OpportunityType = "influencer" | "partnership" | "speaking" | "podcast";

export interface Opportunity {
  type: OpportunityType;
  name: string;
  detail: string;
  /** 0–100 fit with the subject's brand & goals. */
  fit: number;
  audience: string;
}

const TYPE_LABEL: Record<OpportunityType, string> = {
  influencer: "Influencer", partnership: "Partnership", speaking: "Speaking", podcast: "Podcast",
};

/** Map real podcasts (e.g. from iTunes) into podcast opportunities. */
export function podcastOpportunities(podcasts: PodcastResult[]): Opportunity[] {
  return podcasts.map((p) => ({
    type: "podcast" as OpportunityType,
    name: p.name,
    detail: `${p.publisher} · ${p.genre} — guest-appearance opportunity.`,
    // Fit rises with catalog depth (established shows are better targets).
    fit: Math.min(92, 58 + Math.min(p.episodes, 300) / 10),
    audience: `${p.episodes} episode${p.episodes === 1 ? "" : "s"}`,
  }));
}

/**
 * Discover opportunities. When live podcasts are supplied (from the podcast
 * connector), they replace the deterministic podcast entries — the rest stay
 * deterministic until a real source exists for them.
 */
export function discoverOpportunities(subject: Subject, livePodcasts: Opportunity[] = []): Opportunity[] {
  const field = subject.organization ? `${subject.organization}'s space` : "the industry";
  const base: Opportunity[] = [
    { type: "speaking", name: "Industry Summit — keynote track", detail: `Keynote on the future of ${field}.`, fit: 90, audience: "2,000 senior leaders" },
    { type: "podcast", name: "The Founder's Journey", detail: "Long-form interview reaching a founder/operator audience.", fit: 84, audience: "120k downloads/ep" },
    { type: "influencer", name: "Top-tier creator collaboration", detail: "Co-create explainer content to expand reach.", fit: 76, audience: "500k followers" },
    { type: "partnership", name: "Co-marketing with an adjacent brand", detail: "Joint content & cross-promotion to new audiences.", fit: 72, audience: "Shared 250k" },
    { type: "speaking", name: "University guest lecture series", detail: "Authority-building talk for emerging talent.", fit: 64, audience: "Students & faculty" },
    { type: "podcast", name: "Niche vertical show", detail: "Deep-dive with a highly-engaged niche audience.", fit: 60, audience: "30k loyal listeners" },
  ];
  const items = livePodcasts.length > 0 ? [...base.filter((o) => o.type !== "podcast"), ...livePodcasts] : base;
  return items.sort((a, b) => b.fit - a.fit);
}

export function opportunityLabel(type: OpportunityType): string {
  return TYPE_LABEL[type];
}

export interface OpportunitySummary {
  total: number;
  byType: Record<OpportunityType, number>;
  topFit: number;
}

export function summarizeOpportunities(items: Opportunity[]): OpportunitySummary {
  const byType: Record<OpportunityType, number> = { influencer: 0, partnership: 0, speaking: 0, podcast: 0 };
  for (const o of items) byType[o.type] += 1;
  return { total: items.length, byType, topFit: items.reduce((m, o) => Math.max(m, o.fit), 0) };
}
