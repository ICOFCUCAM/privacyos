/**
 * Role-adaptive Command Center.
 *
 * The Command Center is one console, but a personal customer, a public figure, a
 * principal's protective detail and an enterprise security team need to see
 * different things first. This pure module maps the customer's tier + live
 * posture into the headline, the four KPIs and the primary focus that matter for
 * *them* — so the single console reshapes to the buyer instead of showing one
 * generic dashboard. Pure + unit-tested; the page renders the result.
 */

import type { ProtectionTier } from "./tiers";

export type MetricTone = "good" | "warn" | "bad" | "neutral";

export interface CommandMetric {
  label: string;
  value: string;
  tone: MetricTone;
}

export interface CommandView {
  tier: ProtectionTier;
  /** Tier-specific console name. */
  title: string;
  subtitle: string;
  /** The four KPIs that matter most for this persona. */
  metrics: CommandMetric[];
  /** The single most-relevant deep dive for this tier. */
  focus: { label: string; href: string };
}

/** Everything the view model needs, already derived by the page. */
export interface CommandSignals {
  /** 0–100, higher = more protected. */
  protectionScore: number;
  /** Risk sub-scores, 0–100, higher = worse. */
  executiveRisk: number;
  reputationRisk: number;
  businessRisk: number;
  activeThreats: number;
  openCases: number;
  removalsInFlight: number;
  familyMembers: number;
  employeesAtRisk: number;
  vendorsAtRisk: number;
  domainsAtRisk: number;
}

/** Higher-is-worse tone (risk scores). */
function riskTone(n: number): MetricTone {
  return n >= 70 ? "bad" : n >= 40 ? "warn" : "good";
}
/** Higher-is-better tone (protection). */
function protectionTone(n: number): MetricTone {
  return n >= 75 ? "good" : n >= 50 ? "warn" : "bad";
}
/** Count tone — zero is good, a few is a warning, many is bad. */
function countTone(n: number): MetricTone {
  return n === 0 ? "good" : n <= 3 ? "warn" : "bad";
}

const protection = (s: CommandSignals): CommandMetric => ({ label: "Protection", value: `${s.protectionScore}/100`, tone: protectionTone(s.protectionScore) });
const threats = (s: CommandSignals): CommandMetric => ({ label: "Active threats", value: `${s.activeThreats}`, tone: countTone(s.activeThreats) });
const cases = (s: CommandSignals): CommandMetric => ({ label: "Open cases", value: `${s.openCases}`, tone: countTone(s.openCases) });
const removing = (s: CommandSignals): CommandMetric => ({ label: "Removing now", value: `${s.removalsInFlight}`, tone: "neutral" });

export function commandView(tier: ProtectionTier, s: CommandSignals): CommandView {
  switch (tier) {
    case "business":
      return {
        tier,
        title: "Organization Command",
        subtitle: "Cross-domain posture across your whole organization.",
        metrics: [
          { label: "Org risk", value: `${s.businessRisk}/100`, tone: riskTone(s.businessRisk) },
          { label: "Employees at risk", value: `${s.employeesAtRisk}`, tone: countTone(s.employeesAtRisk) },
          { label: "Vendors at risk", value: `${s.vendorsAtRisk}`, tone: countTone(s.vendorsAtRisk) },
          { label: "Domains at risk", value: `${s.domainsAtRisk}`, tone: countTone(s.domainsAtRisk) },
        ],
        focus: { label: "Open Mission Control", href: "/dashboard/mission-control" },
      };
    case "executive":
      return {
        tier,
        title: "Executive Command",
        subtitle: "Principal protection — physical, digital and reputational.",
        metrics: [
          { label: "Executive risk", value: `${s.executiveRisk}/100`, tone: riskTone(s.executiveRisk) },
          threats(s),
          cases(s),
          { label: "Household", value: `${s.familyMembers}`, tone: "neutral" },
        ],
        focus: { label: "Open Executive Protection", href: "/dashboard/executive" },
      };
    case "professional":
      return {
        tier,
        title: "Reputation Command",
        subtitle: "Your coverage, search presence and recovery.",
        metrics: [
          { label: "Reputation risk", value: `${s.reputationRisk}/100`, tone: riskTone(s.reputationRisk) },
          threats(s),
          removing(s),
          cases(s),
        ],
        focus: { label: "Open ReputationOS", href: "/dashboard/reputation" },
      };
    default:
      return {
        tier: "personal",
        title: "Protection Command",
        subtitle: "Everything we're watching and handling for you.",
        metrics: [protection(s), threats(s), removing(s), cases(s)],
        focus: { label: "Open Protection", href: "/dashboard/home" },
      };
  }
}
