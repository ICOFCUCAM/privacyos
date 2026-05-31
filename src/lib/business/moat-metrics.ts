/**
 * Automation-moat and proprietary-data metrics.
 *
 * Defensibility metrics investors underwrite an AI-security platform on: how
 * much work the autonomous agents do without a human (the automation moat) and
 * how large the proprietary intelligence corpus has grown. Detection accuracy
 * now lives in lib/detection (real scoring algorithms), not here. Pure and
 * unit-tested — derived from the same domain dataset the product runs on.
 */

import type { AgentAction } from "@/lib/suite-types";

const pct = (n: number) => Math.round(n * 1000) / 10;

/* ── Automation moat ─────────────────────────────────────────────────────── */

export interface AutomationMoat {
  totalActions: number;
  autonomousActions: number;
  humanActions: number;
  /** Share of all actions executed without a human, 0–100. */
  automationRate: number;
  /** Estimated analyst-hours saved (autonomous actions × minutes/action). */
  hoursSaved: number;
  /** Annualized labor-cost equivalent of automation, USD. */
  laborValue: number;
}

const MINUTES_PER_ACTION = 22; // avg analyst minutes to do one action manually
const ANALYST_HOURLY = 75; // blended fully-loaded analyst cost / hour

/**
 * The automation moat: what fraction of defensive work the agents do without a
 * human, and the labor value that represents. `humanActionKinds` are the action
 * kinds that still require sign-off (e.g. escalations).
 */
export function automationMoat(
  actions: AgentAction[],
  humanActionKinds: string[] = ["escalate"],
  windowDays = 30,
): AutomationMoat {
  const total = actions.length;
  const human = actions.filter((a) => humanActionKinds.includes(a.kind)).length;
  const autonomous = total - human;
  const automationRate = total === 0 ? 0 : pct(autonomous / total);
  // Scale the observed window to an annual figure.
  const annualMultiplier = windowDays > 0 ? 365 / windowDays : 1;
  const annualAutonomous = autonomous * annualMultiplier;
  const hoursSaved = Math.round((annualAutonomous * MINUTES_PER_ACTION) / 60);
  const laborValue = Math.round(hoursSaved * ANALYST_HOURLY);
  return { totalActions: total, autonomousActions: autonomous, humanActions: human, automationRate, hoursSaved, laborValue };
}

/* ── Proprietary data corpus ─────────────────────────────────────────────── */

export interface DataCorpus {
  /** Distinct signal types we ingest. */
  signalTypes: number;
  /** Total intelligence records under management. */
  records: number;
  /** Records added per day (velocity of the proprietary corpus). */
  dailyVelocity: number;
  /** Coverage breadth — number of distinct source categories. */
  sources: number;
}

export function dataCorpus(input: {
  exposures: number;
  threats: number;
  mentions: number;
  incidents: number;
  credentialLeaks: number;
  domainRisks: number;
  sources: number;
  windowDays?: number;
}): DataCorpus {
  const records =
    input.exposures + input.threats + input.mentions + input.incidents +
    input.credentialLeaks + input.domainRisks;
  const windowDays = input.windowDays ?? 30;
  return {
    signalTypes: 6,
    records,
    dailyVelocity: windowDays > 0 ? Math.round(records / windowDays) : records,
    sources: input.sources,
  };
}
