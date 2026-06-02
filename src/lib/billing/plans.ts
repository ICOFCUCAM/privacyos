/**
 * PrivacyOS plan catalog.
 *
 * The single source of truth for pricing across the product (pricing page, plan
 * gating, future Stripe checkout). Prices are monthly USD; annual billing applies
 * a 20% discount (see `ANNUAL_DISCOUNT`). `priceId` placeholders map to Stripe
 * price IDs once billing is wired.
 */

export type PlanCategory = "personal" | "reputation" | "executive" | "business" | "ai_addon";

export interface Plan {
  id: string;
  category: PlanCategory;
  name: string;
  /** Monthly price in USD, or null for "custom / contact us". */
  monthly: number | null;
  tagline: string;
  target?: string;
  /** Capacity note shown under the price (e.g. "Up to 25 employees"). */
  capacity?: string;
  features: string[];
  /** Highlight as the recommended tier within its category. */
  featured?: boolean;
  priceId?: string; // Stripe price id (filled when billing is connected)
}

export const ANNUAL_DISCOUNT = 0.2; // 20% off with annual billing

/** Annual per-month equivalent after the discount. */
export function annualMonthly(monthly: number): number {
  return Math.round(monthly * (1 - ANNUAL_DISCOUNT) * 100) / 100;
}

/** Total billed once per year. */
export function annualTotal(monthly: number): number {
  return Math.round(annualMonthly(monthly) * 12);
}

export const CATEGORY_META: Record<
  PlanCategory,
  { label: string; blurb: string }
> = {
  personal: { label: "Personal", blurb: "Privacy, identity & dark-web protection for individuals and families." },
  reputation: { label: "ReputationOS", blurb: "Search, brand, news & sentiment monitoring with recovery." },
  executive: { label: "ExecutiveOS", blurb: "VIP-grade protection: doxxing, deepfakes, threats & travel risk." },
  business: { label: "BusinessOS", blurb: "Org-wide credential, domain, brand & third-party risk intelligence." },
  ai_addon: { label: "AI Agent Add-on", blurb: "Autonomous monitoring, remediation & intelligence — on any plan." },
};

export const PLANS: Plan[] = [
  // ── Free assessment (conversion engine — one scan, not a usage tier) ───────
  {
    id: "free", category: "personal", name: "Free Exposure Scan", monthly: 0,
    tagline: "See what's exposed about you — one free scan, no card required.",
    target: "Everyone",
    features: [
      "One complete exposure scan", "Exposure report", "Protection score",
      "Up to 10 Data Broker Removals",
    ],
  },
  // ── Personal ──────────────────────────────────────────────────────────────
  {
    id: "starter", category: "personal", name: "PrivacyOS Starter", monthly: 14.99,
    tagline: "Basic online privacy protection for individuals.", target: "Individuals",
    features: [
      "Privacy Exposure Scan", "Privacy Score", "Identity Monitoring",
      "Dark Web Monitoring", "Monthly Risk Reports", "AI Privacy Assistant",
      "Up to 10 Data Broker Removals", "Email Alerts",
    ],
  },
  {
    id: "plus", category: "personal", name: "PrivacyOS Plus", monthly: 29.99,
    tagline: "Enhanced protection for professionals and families.", target: "Professionals", featured: true,
    features: [
      "Everything in Starter", "Continuous Monitoring", "Unlimited Exposure Scans",
      "Up to 50 Data Broker Removals", "Identity Protection", "Reputation Monitoring",
      "Social Media Monitoring", "Weekly Risk Reports", "AI Privacy Agent",
    ],
  },
  {
    id: "premium", category: "personal", name: "PrivacyOS Premium", monthly: 49.99,
    tagline: "Complete personal protection.", target: "High-risk individuals",
    features: [
      "Everything in Plus", "Unlimited Data Broker Removals", "Deep Web Monitoring",
      "Advanced Threat Detection", "Family Exposure Monitoring", "AI Risk Analysis",
      "Priority Support", "Real-Time Alerts",
    ],
  },
  {
    id: "family", category: "personal", name: "PrivacyOS Family", monthly: 99,
    tagline: "Protection for households.", target: "Families", capacity: "Up to 6 family members",
    features: [
      "Up to 6 Family Members", "Child Privacy Monitoring", "Family Exposure Monitoring",
      "Shared Risk Dashboard", "Identity Theft Monitoring", "Reputation Monitoring",
      "Family AI Assistant",
    ],
  },

  // ── ReputationOS ──────────────────────────────────────────────────────────
  {
    id: "rep-professional", category: "reputation", name: "Professional", monthly: 149,
    tagline: "For professionals and consultants.",
    features: [
      "Search Result Monitoring", "Brand Monitoring", "News Monitoring",
      "Sentiment Analysis", "Reputation Score", "AI Reputation Advisor",
    ],
  },
  {
    id: "rep-creator", category: "reputation", name: "Creator", monthly: 299,
    tagline: "For influencers and public personalities.", featured: true,
    features: [
      "Everything in Professional", "Social Listening", "Mention Tracking",
      "Viral Risk Monitoring", "SEO Recovery Recommendations", "Defamation Monitoring",
    ],
  },
  {
    id: "rep-public-figure", category: "reputation", name: "Public Figure", monthly: 499,
    tagline: "For public figures and executives.",
    features: [
      "Everything in Creator", "Reputation Crisis Monitoring", "Priority Escalation",
      "Media Risk Alerts", "Executive Reports",
    ],
  },

  // ── ExecutiveOS ───────────────────────────────────────────────────────────
  {
    id: "exec-essential", category: "executive", name: "Executive Essential", monthly: 999,
    tagline: "Core protection for executives.",
    features: [
      "Doxxing Monitoring", "Impersonation Detection", "Executive Dashboard",
      "Threat Monitoring", "Deepfake Monitoring", "Family Exposure Alerts",
    ],
  },
  {
    id: "exec-pro", category: "executive", name: "Executive Pro", monthly: 2499,
    tagline: "Advanced intelligence and dedicated support.", featured: true,
    features: [
      "Everything in Essential", "Travel Risk Intelligence", "Advanced Threat Intelligence",
      "Priority Investigation", "Dedicated Account Manager", "Incident Response Support",
    ],
  },
  {
    id: "exec-elite", category: "executive", name: "Executive Elite", monthly: 4999,
    tagline: "White-glove, concierge-grade protection.",
    features: [
      "Everything in Pro", "Concierge Protection Team", "White Glove Onboarding",
      "VIP Monitoring", "Executive Risk Assessments", "Priority AI Agents",
    ],
  },

  // ── BusinessOS ────────────────────────────────────────────────────────────
  {
    id: "biz-startup", category: "business", name: "Startup", monthly: 999, capacity: "Up to 25 employees",
    tagline: "Org protection for small teams.",
    features: [
      "Employee Exposure Monitoring", "Credential Leak Monitoring", "Domain Monitoring",
      "Brand Protection", "Monthly Reports",
    ],
  },
  {
    id: "biz-growth", category: "business", name: "Growth", monthly: 2999, capacity: "Up to 250 employees",
    tagline: "Scaling protection with compliance.", featured: true,
    features: [
      "Everything in Startup", "Executive Protection", "Third-Party Risk Monitoring",
      "Compliance Dashboard", "AI Security Agent",
    ],
  },
  {
    id: "biz-enterprise", category: "business", name: "Enterprise", monthly: 9999, capacity: "Up to 2,500 employees",
    tagline: "Enterprise-grade risk intelligence.",
    features: [
      "Everything in Growth", "Enterprise Risk Intelligence", "Multi-Team Access",
      "Custom Policies", "Dedicated Success Manager", "Advanced Reporting",
    ],
  },
  {
    id: "biz-enterprise-plus", category: "business", name: "Enterprise Plus", monthly: 24999, capacity: "Unlimited scale",
    tagline: "Bespoke deployment and advisory.",
    features: [
      "Everything in Enterprise", "Custom Integrations", "Private Infrastructure Options",
      "Dedicated Intelligence Team", "Executive Advisory Services",
    ],
  },

  // ── AI Agent add-on ───────────────────────────────────────────────────────
  {
    id: "ai-pack", category: "ai_addon", name: "AI Agent Pack", monthly: 199,
    tagline: "Autonomous monitoring on top of any plan.",
    features: [
      "Continuous Monitoring", "Automated Risk Discovery", "Automated Reports",
      "Automated Remediation Recommendations",
    ],
  },
  {
    id: "ai-pro", category: "ai_addon", name: "AI Agent Pro", monthly: 999,
    tagline: "Multi-agent autonomous operations.", featured: true,
    features: [
      "Multi-Agent System", "Autonomous Threat Analysis", "Legal Request Drafting",
      "Automated Escalations", "Advanced Intelligence Reports",
    ],
  },
  {
    id: "ai-enterprise", category: "ai_addon", name: "AI Agent Enterprise", monthly: null,
    tagline: "Fully autonomous digital-risk operations.",
    features: [
      "Fully Autonomous Digital Risk Operations", "Custom Agent Workflows",
      "Company-Specific Intelligence Models", "Enterprise Automation",
    ],
  },
];

export const CATEGORY_ORDER: PlanCategory[] = ["personal", "reputation", "executive", "business", "ai_addon"];

export function plansByCategory(category: PlanCategory): Plan[] {
  return PLANS.filter((p) => p.category === category);
}
