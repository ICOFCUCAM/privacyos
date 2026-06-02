/**
 * Workflow Marketplace (Layer 13).
 *
 * A consumer-facing storefront of installable workflow packs. Where the
 * template catalog (Layer 2) is the engineer's library, the marketplace is the
 * one-click shelf: each listing is a named outcome ("Protect My CEO", "Remove
 * Data Brokers") backed by one or more catalog templates that install together.
 * Pure and unit-tested — every listing resolves to real templates and installs
 * into valid, editable workflow definitions, so "Install" always works.
 */

import type { AgentKind } from "@/lib/types";
import {
  findTemplate, templateAgents, templateToDefinition,
  type WorkflowTemplate,
} from "./automation-templates";
import type { WorkflowDefinition } from "./workflow-builder";

export type MarketplaceCategory =
  | "Executive" | "Family" | "Security" | "Reputation" | "Privacy";

export interface MarketplaceListing {
  /** Slug. */
  id: string;
  /** Consumer-facing name, e.g. "Protect My CEO". */
  name: string;
  /** One-line pitch. */
  tagline: string;
  description: string;
  category: MarketplaceCategory;
  /** Backing catalog templates installed together (in order). */
  templateIds: string[];
  /** Surfaced in the featured row. */
  featured?: boolean;
  /** Social proof. */
  installs: number;
  /** 0–5, one decimal. */
  rating: number;
}

export const MARKETPLACE_LISTINGS: MarketplaceListing[] = [
  {
    id: "protect-my-ceo",
    name: "Protect My CEO",
    tagline: "Round-the-clock executive protection on autopilot.",
    description: "Sweeps every layer for the principal daily, recomputes the Executive Risk Score, and escalates a critical threat into a case, an incident assignment and a board report — end to end.",
    category: "Executive",
    templateIds: ["executive-protection-sweep", "critical-escalation"],
    featured: true,
    installs: 1842,
    rating: 4.9,
  },
  {
    id: "protect-my-family",
    name: "Protect My Family",
    tagline: "Keep your whole household off the data brokers.",
    description: "Weekly sweep of the family roster's footprint, opt at-risk relatives out of people-search, and remove the brokers reselling their data — with a child-safety briefing.",
    category: "Family",
    templateIds: ["family-protection-sweep", "broker-removal"],
    featured: true,
    installs: 2310,
    rating: 4.8,
  },
  {
    id: "breach-response",
    name: "Breach Response",
    tagline: "From leaked credential to closed case, automatically.",
    description: "Correlates the breach against known leak sources, rotates exposed credentials, weighs legal notification duties, opens a case and files the incident record.",
    category: "Security",
    templateIds: ["breach-response", "credential-leak-response"],
    featured: true,
    installs: 3127,
    rating: 4.9,
  },
  {
    id: "reputation-recovery",
    name: "Reputation Recovery",
    tagline: "Push the negatives down and the truth up.",
    description: "Analyses negative coverage and sentiment, opens a recovery case, runs a suppression and positive-content plan, and tracks rank and sentiment back to health.",
    category: "Reputation",
    templateIds: ["reputation-recovery", "seo-recovery"],
    featured: true,
    installs: 1456,
    rating: 4.7,
  },
  {
    id: "remove-data-brokers",
    name: "Remove Data Brokers",
    tagline: "Erase yourself from the people-search economy.",
    description: "Files opt-out and removal requests across the broker network, monitors for reappearance, hardens identity records, and logs every removal for compliance.",
    category: "Privacy",
    templateIds: ["broker-removal", "identity-protection"],
    featured: true,
    installs: 4015,
    rating: 4.8,
  },
  {
    id: "dark-web-watch",
    name: "Dark Web Watch",
    tagline: "Know the moment your data surfaces.",
    description: "Scans dark-web sources for the principal on a schedule and, on a match, alerts and opens a case to action the exposure.",
    category: "Security",
    templateIds: ["dark-web-monitoring"],
    installs: 982,
    rating: 4.6,
  },
  {
    id: "vendor-risk-guard",
    name: "Vendor Risk Guard",
    tagline: "Catch third-party risk before it's your incident.",
    description: "Assesses the vendor portfolio weekly and escalates a high-risk vendor through an approval gate into incident response.",
    category: "Security",
    templateIds: ["vendor-risk-assessment", "employee-exposure-response"],
    installs: 671,
    rating: 4.5,
  },
];

/** Resolve a listing's backing templates (skips any unknown id defensively). */
export function listingTemplates(listing: MarketplaceListing): WorkflowTemplate[] {
  return listing.templateIds
    .map((id) => findTemplate(id))
    .filter((t): t is WorkflowTemplate => !!t);
}

/** One-click install: instantiate every backing template into a fresh draft. */
export function installListing(listing: MarketplaceListing): WorkflowDefinition[] {
  return listingTemplates(listing).map((t) => templateToDefinition(t));
}

export interface ListingSummary {
  workflows: number;
  steps: number;
  agents: AgentKind[];
  /** Combined estimated risk-score reduction. */
  riskReduction: number;
}

export function listingSummary(listing: MarketplaceListing): ListingSummary {
  const templates = listingTemplates(listing);
  const agents = new Set<AgentKind>();
  let steps = 0;
  let riskReduction = 0;
  for (const t of templates) {
    steps += t.steps.length;
    riskReduction += t.impact;
    for (const a of templateAgents(t)) agents.add(a);
  }
  return { workflows: templates.length, steps, agents: [...agents], riskReduction };
}

export function findListing(id: string): MarketplaceListing | undefined {
  return MARKETPLACE_LISTINGS.find((l) => l.id === id);
}

export function featuredListings(listings = MARKETPLACE_LISTINGS): MarketplaceListing[] {
  return listings.filter((l) => l.featured);
}

export interface MarketplaceStats {
  listings: number;
  featured: number;
  totalInstalls: number;
  /** Mean rating across listings, one decimal. */
  avgRating: number;
}

export function marketplaceStats(listings = MARKETPLACE_LISTINGS): MarketplaceStats {
  const totalInstalls = listings.reduce((s, l) => s + l.installs, 0);
  const avgRating = listings.length === 0
    ? 0
    : Math.round((listings.reduce((s, l) => s + l.rating, 0) / listings.length) * 10) / 10;
  return {
    listings: listings.length,
    featured: listings.filter((l) => l.featured).length,
    totalInstalls,
    avgRating,
  };
}
