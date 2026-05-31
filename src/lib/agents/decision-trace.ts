/**
 * Agent decision traces — explainability for the fleet.
 *
 * For every agent, this derives a structured, deterministic trace of *why* it
 * acted: what it observed in the footprint, the reasoning it applied, the
 * decision it reached, and the action it took (or why it stayed idle). This
 * turns the agents from a black box into an auditable, explainable team — the
 * record compliance and trust narratives depend on. Pure and unit-tested.
 */

import type { AgentKind, Exposure, Recommendation, RiskLevel, Threat } from "@/lib/types";
import { AGENT_CATALOG } from "@/lib/data/mappers";

export type TraceVerdict = "action" | "monitoring" | "idle";

export interface DecisionTrace {
  agent: AgentKind;
  name: string;
  /** What the agent saw in the footprint relevant to its domain. */
  observed: string[];
  /** The reasoning rule(s) it applied. */
  reasoning: string;
  /** The decision it reached. */
  decision: string;
  /** Resulting recommendations (titles), if any. */
  actions: string[];
  /** Highest risk among the agent's relevant inputs. */
  severity: RiskLevel;
  verdict: TraceVerdict;
  /** Count of footprint items the agent considered. */
  signalsConsidered: number;
}

export interface TraceInput {
  exposures: Exposure[];
  threats: Threat[];
  recommendations: Recommendation[];
}

const RISK_RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };
function topSeverity(levels: RiskLevel[]): RiskLevel {
  return levels.reduce<RiskLevel>((acc, l) => (RISK_RANK[l] > RISK_RANK[acc] ? l : acc), "low");
}

/** Which exposures/threats each agent's domain considers relevant. */
function relevantSignals(agent: AgentKind, input: TraceInput): { items: RiskLevel[]; summary: string[] } {
  const { exposures, threats } = input;
  const exp = (pred: (e: Exposure) => boolean) => exposures.filter(pred);
  const thr = (pred: (t: Threat) => boolean) => threats.filter(pred);

  switch (agent) {
    case "discovery": {
      const items = exposures;
      return { items: items.map((e) => e.riskLevel), summary: [`${items.length} discoverable exposures across ${new Set(items.map((e) => e.source)).size} sources`] };
    }
    case "privacy": {
      const brokers = exp((e) => e.source === "data_broker" || e.source === "public_record");
      return { items: brokers.map((e) => e.riskLevel), summary: [`${brokers.length} broker / public-record listings`] };
    }
    case "security": {
      const leaks = exp((e) => e.category === "credential" || e.source === "dark_web" || e.source === "breach_db");
      const t = thr((x) => x.kind === "credential_leak" || x.kind === "dark_web_mention");
      return { items: [...leaks.map((e) => e.riskLevel), ...t.map((x) => x.riskLevel)], summary: [`${leaks.length} credential/dark-web exposures`, `${t.length} breach threats`] };
    }
    case "deepfake": {
      const synth = exp((e) => e.source === "ai_generated");
      const t = thr((x) => x.kind === "deepfake" || x.kind === "impersonation");
      return { items: [...synth.map((e) => e.riskLevel), ...t.map((x) => x.riskLevel)], summary: [`${synth.length} synthetic-media exposures`, `${t.length} deepfake/impersonation threats`] };
    }
    case "reputation": {
      const t = thr((x) => x.kind === "negative_press");
      const news = exp((e) => e.source === "news" || e.source === "forum");
      return { items: [...news.map((e) => e.riskLevel), ...t.map((x) => x.riskLevel)], summary: [`${news.length} news/forum mentions`, `${t.length} negative-press signals`] };
    }
    case "executive": {
      const t = thr((x) => x.kind === "doxxing" || x.kind === "location_exposure");
      const addr = exp((e) => e.category === "address" || e.category === "family");
      return { items: [...addr.map((e) => e.riskLevel), ...t.map((x) => x.riskLevel)], summary: [`${addr.length} location/family exposures`, `${t.length} physical-security threats`] };
    }
    case "legal":
    case "compliance": {
      const actionable = exp((e) => e.source === "data_broker" || e.source === "public_record");
      return { items: actionable.map((e) => e.riskLevel), summary: [`${actionable.length} exposures eligible for legal/erasure requests`] };
    }
    case "business":
    case "vendor": {
      const t = thr((x) => x.kind === "impersonation");
      const cred = exp((e) => e.category === "credential" || e.category === "employer");
      return { items: [...cred.map((e) => e.riskLevel), ...t.map((x) => x.riskLevel)], summary: [`${cred.length} org credential/employer exposures`, `${t.length} brand-impersonation signals`] };
    }
    case "threat_intel":
    case "orchestrator":
    case "incident": {
      const open = thr((x) => !x.acknowledged);
      const crit = exposures.filter((e) => e.riskLevel === "critical");
      return { items: [...open.map((x) => x.riskLevel), ...crit.map((e) => e.riskLevel)], summary: [`${open.length} open threats`, `${crit.length} critical exposures across the fleet`] };
    }
    default:
      return { items: [], summary: ["No relevant signals"] };
  }
}

const REASONING: Partial<Record<AgentKind, string>> = {
  discovery: "Sweeps every public surface and breach feed; any new match is indexed and risk-scored.",
  privacy: "Listings on data brokers and public records are removable; files opt-outs and tracks re-checks.",
  security: "Credential and dark-web exposure drives account-takeover risk; prioritizes rotation and breach response.",
  deepfake: "Synthetic media and impersonation are scored by detector confidence; high confidence triggers takedown.",
  reputation: "Negative press and forum sentiment are weighted by reach; defamatory items escalate to legal.",
  executive: "Address/family exposure and doxxing carry physical-security weight; VIP threshold is stricter.",
  legal: "Eligible exposures map to GDPR/CCPA erasure or complaint templates.",
  compliance: "Continuously checks control posture and framework coverage; flags drift.",
  business: "Aggregates per-employee exposure into org-level risk; brand impersonation triggers takedowns.",
  vendor: "Third-party and supply-chain signals are re-scored; elevated vendors get attestation requests.",
  threat_intel: "Correlates signals across sources into emerging-threat narratives.",
  orchestrator: "Triages the whole queue; routes the highest impact × confidence × risk first.",
  incident: "Matches findings to response playbooks; auto-runs safe steps, escalates the rest.",
};

/** Build one agent's decision trace from the footprint. */
export function buildTrace(agent: AgentKind, name: string, input: TraceInput): DecisionTrace {
  const { items, summary } = relevantSignals(agent, input);
  const recs = input.recommendations.filter((r) => r.agent === agent);
  const severity = topSeverity(items.length ? items : ["low"]);
  const verdict: TraceVerdict = recs.length > 0 ? "action" : items.length > 0 ? "monitoring" : "idle";
  const decision =
    verdict === "action"
      ? `Raised ${recs.length} recommendation${recs.length === 1 ? "" : "s"} (${severity} severity).`
      : verdict === "monitoring"
        ? `No action required now — ${items.length} signal${items.length === 1 ? "" : "s"} under continuous watch.`
        : "No relevant signals in the current footprint — idle.";
  return {
    agent,
    name,
    observed: summary,
    reasoning: REASONING[agent] ?? "Applies its domain rules to the footprint.",
    decision,
    actions: recs.map((r) => r.title),
    severity,
    verdict,
    signalsConsidered: items.length,
  };
}

/** Build traces for the whole fleet (catalog order). */
export function buildFleetTraces(input: TraceInput): DecisionTrace[] {
  return AGENT_CATALOG.map((a) => buildTrace(a.kind, a.name, input));
}

export interface TraceSummary {
  acting: number;
  monitoring: number;
  idle: number;
  totalSignals: number;
}

export function summarizeTraces(traces: DecisionTrace[]): TraceSummary {
  return {
    acting: traces.filter((t) => t.verdict === "action").length,
    monitoring: traces.filter((t) => t.verdict === "monitoring").length,
    idle: traces.filter((t) => t.verdict === "idle").length,
    totalSignals: traces.reduce((s, t) => s + t.signalsConsidered, 0),
  };
}
