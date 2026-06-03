/**
 * Executive Protection OS — Attack Path Analysis (the exposure kill-chain).
 *
 * Competitors show a flat list of exposures. This models how an adversary
 * *chains* the principal's exposures and threats into real-world harm (swatting,
 * account takeover, identity theft, stalking, pretexting, extortion), scores
 * each path by feasibility × impact, and computes the **chokepoint**: the single
 * signal whose removal collapses the most/highest-scoring paths — the one shot
 * that protects most. Pure and unit-tested.
 */

import type { CredentialLeak } from "@/lib/suite-types";
import type { Exposure, Threat } from "@/lib/types";

export type Signal =
  | "address" | "phone" | "family" | "email" | "username" | "photo"
  | "financial" | "employer" | "credential" | "breach" | "darkweb"
  | "doxxing" | "location" | "impersonation";

export const SIGNAL_META: Record<Signal, { label: string; action: string }> = {
  address: { label: "Home address", action: "Suppress the home address (broker opt-outs + street-view blur)" },
  phone: { label: "Phone number", action: "Remove the phone number from brokers and people-search" },
  family: { label: "Family identifiers", action: "Opt relatives out of people-search and lock down their profiles" },
  email: { label: "Email address", action: "Rotate/alias the exposed email and tighten account recovery" },
  username: { label: "Username", action: "Decouple reused usernames across accounts" },
  photo: { label: "Photos / likeness", action: "Request removal of exposed photos and watch for synthetic reuse" },
  financial: { label: "Financial data", action: "Freeze credit and remove financial records from brokers" },
  employer: { label: "Employer / affiliation", action: "Reduce public affiliation detail and brief staff on pretexting" },
  credential: { label: "Leaked credentials", action: "Force-rotate leaked credentials and enforce 2FA/passkeys" },
  breach: { label: "Breach records", action: "Request deletion of PII from breach aggregators" },
  darkweb: { label: "Dark-web presence", action: "Investigate dark-web listings and engage takedown/IR" },
  doxxing: { label: "Active doxxing", action: "File platform takedowns for the doxxing content and preserve evidence" },
  location: { label: "Live location", action: "Strip geotags and disable real-time location sharing" },
  impersonation: { label: "Impersonation / deepfake", action: "Report impersonation accounts and DMCA deepfakes" },
};

export interface SignalHit {
  count: number;
  sample: string;
}

/** Index the footprint into present signals (count + a sample label each). */
export function buildSignalIndex(input: AttackInput): Partial<Record<Signal, SignalHit>> {
  const idx: Partial<Record<Signal, SignalHit>> = {};
  const add = (s: Signal, sample: string) => {
    const hit = idx[s] ?? { count: 0, sample };
    hit.count += 1;
    idx[s] = hit;
  };

  const CATEGORY_SIGNAL: Partial<Record<Exposure["category"], Signal>> = {
    address: "address", phone: "phone", family: "family", email: "email",
    username: "username", photo: "photo", financial: "financial", employer: "employer", credential: "credential",
  };
  for (const e of input.exposures) {
    const sig = CATEGORY_SIGNAL[e.category];
    if (sig) add(sig, e.sourceName);
    if (e.source === "breach_db") add("breach", e.sourceName);
    if (e.source === "dark_web") add("darkweb", e.sourceName);
  }

  for (const t of input.threats) {
    if (t.acknowledged) continue;
    if (t.kind === "doxxing") add("doxxing", t.source);
    else if (t.kind === "location_exposure") add("location", t.source);
    else if (t.kind === "dark_web_mention") add("darkweb", t.source);
    else if (t.kind === "credential_leak") add("credential", t.source);
    else if (t.kind === "impersonation" || t.kind === "deepfake") add("impersonation", t.source);
  }

  for (const l of input.credentialLeaks ?? []) add("credential", l.breachName);

  return idx;
}

interface PathDef {
  id: string;
  name: string;
  harm: string;
  impact: number;
  signals: Signal[];
}

const PATHS: PathDef[] = [
  { id: "swatting", name: "Swatting / doxxing", harm: "Armed emergency response sent to the principal's home", impact: 95, signals: ["address", "phone", "doxxing", "family"] },
  { id: "stalking", name: "Physical surveillance / stalking", harm: "In-person tracking of the principal's movements", impact: 92, signals: ["address", "location", "photo"] },
  { id: "idtheft", name: "Identity theft", harm: "Fraudulent accounts and credit opened in the principal's name", impact: 85, signals: ["address", "financial", "breach", "email"] },
  { id: "ato", name: "Account takeover", harm: "Email, financial and social accounts hijacked", impact: 82, signals: ["email", "credential", "breach"] },
  { id: "extortion", name: "Extortion / blackmail", harm: "Coercion using leaked or fabricated material", impact: 80, signals: ["darkweb", "photo", "credential"] },
  { id: "pretext", name: "Social engineering / pretexting", harm: "Staff or family manipulated via impersonation", impact: 75, signals: ["employer", "email", "impersonation"] },
];

export interface AttackStep {
  signal: Signal;
  label: string;
  present: boolean;
  evidence?: string;
}

export interface AttackPath {
  id: string;
  name: string;
  harm: string;
  impact: number;
  steps: AttackStep[];
  present: number;
  total: number;
  /** 0–100 share of the chain present. */
  feasibility: number;
  /** 0–100 = feasibility × impact. */
  score: number;
  enabled: boolean;
}

export interface Chokepoint {
  signal: Signal;
  label: string;
  action: string;
  count: number;
  /** Enabled paths this signal participates in. */
  breaks: number;
  /** Total enabled-path score removed by eliminating it. */
  scoreReduction: number;
}

/** Signals remediated by broker opt-outs (vs. threat/IR investigation). */
const REMOVAL_SIGNALS = new Set<Signal>([
  "address", "phone", "family", "email", "username", "photo", "financial", "employer", "breach",
]);

/**
 * Where to act on a signal — turning an attack-path finding into a one-click
 * fix instead of dead analysis. Broker-removable signals go to Broker Removals;
 * credential/dark-web/doxxing/impersonation/location go to the Threat feed where
 * they're investigated and worked.
 */
export function remediationHref(signal: Signal): string {
  return REMOVAL_SIGNALS.has(signal) ? "/dashboard/removals" : "/dashboard/threats";
}

export interface AttackInput {
  exposures: Exposure[];
  threats: Threat[];
  credentialLeaks?: CredentialLeak[];
}

export interface AttackSurface {
  paths: AttackPath[];
  enabledPaths: number;
  topScore: number;
  chokepoint: Chokepoint | null;
}

/** A path is live once half its chain (and ≥2 links) are present. */
function isEnabled(present: number, total: number): boolean {
  return present >= 2 && present / total >= 0.5;
}

/**
 * Build the ranked attack paths and the single highest-leverage chokepoint.
 */
export function analyzeAttackSurface(input: AttackInput): AttackSurface {
  const idx = buildSignalIndex(input);

  const paths: AttackPath[] = PATHS.map((p) => {
    const steps: AttackStep[] = p.signals.map((sig) => {
      const hit = idx[sig];
      return { signal: sig, label: SIGNAL_META[sig].label, present: !!hit, evidence: hit?.sample };
    });
    const present = steps.filter((s) => s.present).length;
    const total = steps.length;
    const feasibility = Math.round((present / total) * 100);
    const enabled = isEnabled(present, total);
    return { id: p.id, name: p.name, harm: p.harm, impact: p.impact, steps, present, total, feasibility, score: Math.round((present / total) * p.impact), enabled };
  }).sort((a, b) => b.score - a.score || b.impact - a.impact);

  const enabled = paths.filter((p) => p.enabled);

  // Chokepoint: the present signal that participates in the most enabled paths,
  // breaking ties by total score removed — the one fix with the most leverage.
  const tally = new Map<Signal, { breaks: number; scoreReduction: number }>();
  for (const path of enabled) {
    for (const step of path.steps) {
      if (!step.present) continue;
      const t = tally.get(step.signal) ?? { breaks: 0, scoreReduction: 0 };
      t.breaks += 1;
      t.scoreReduction += path.score;
      tally.set(step.signal, t);
    }
  }

  let chokepoint: Chokepoint | null = null;
  for (const [signal, t] of tally) {
    if (!chokepoint || t.breaks > chokepoint.breaks || (t.breaks === chokepoint.breaks && t.scoreReduction > chokepoint.scoreReduction)) {
      chokepoint = {
        signal,
        label: SIGNAL_META[signal].label,
        action: SIGNAL_META[signal].action,
        count: idx[signal]?.count ?? 0,
        breaks: t.breaks,
        scoreReduction: t.scoreReduction,
      };
    }
  }

  return { paths, enabledPaths: enabled.length, topScore: paths[0]?.score ?? 0, chokepoint };
}

/* ── What-if leverage analysis ───────────────────────────────────────────── */

const CATEGORY_FOR_SIGNAL: Partial<Record<Signal, Exposure["category"]>> = {
  address: "address", phone: "phone", family: "family", email: "email",
  username: "username", photo: "photo", financial: "financial", employer: "employer", credential: "credential",
};

/** Return the footprint with everything that contributes `signal` removed. */
export function removeSignal(input: AttackInput, signal: Signal): AttackInput {
  const cat = CATEGORY_FOR_SIGNAL[signal];
  const exposures = input.exposures.filter((e) => {
    if (cat && e.category === cat) return false;
    if (signal === "breach" && e.source === "breach_db") return false;
    if (signal === "darkweb" && e.source === "dark_web") return false;
    return true;
  });
  const threats = input.threats.filter((t) => {
    if (signal === "credential" && t.kind === "credential_leak") return false;
    if (signal === "darkweb" && t.kind === "dark_web_mention") return false;
    if (signal === "doxxing" && t.kind === "doxxing") return false;
    if (signal === "location" && t.kind === "location_exposure") return false;
    if (signal === "impersonation" && (t.kind === "impersonation" || t.kind === "deepfake")) return false;
    return true;
  });
  const credentialLeaks = signal === "credential" ? [] : input.credentialLeaks;
  return { exposures, threats, credentialLeaks };
}

export interface RemovalImpact {
  signal: Signal;
  label: string;
  action: string;
  count: number;
  pathsBroken: number;
  pathsAfter: number;
  topScoreAfter: number;
  scoreDrop: number;
}

function enabledScore(s: AttackSurface): number {
  return s.paths.filter((p) => p.enabled).reduce((sum, p) => sum + p.score, 0);
}

/**
 * For every present signal, simulate removing it and measure the impact — a
 * ranked "remove this → gain that" playbook (the chokepoint is the top row).
 */
export function simulateRemovals(input: AttackInput): RemovalImpact[] {
  const before = analyzeAttackSurface(input);
  const beforeScore = enabledScore(before);
  const idx = buildSignalIndex(input);

  return (Object.keys(idx) as Signal[])
    .map((signal) => {
      const after = analyzeAttackSurface(removeSignal(input, signal));
      return {
        signal,
        label: SIGNAL_META[signal].label,
        action: SIGNAL_META[signal].action,
        count: idx[signal]?.count ?? 0,
        pathsBroken: before.enabledPaths - after.enabledPaths,
        pathsAfter: after.enabledPaths,
        topScoreAfter: after.topScore,
        scoreDrop: beforeScore - enabledScore(after),
      };
    })
    // Rank by risk removed: with a 50% chain threshold, eliminating one signal
    // usually *weakens* paths (scoreDrop) more than it fully disables them.
    .sort((a, b) => b.scoreDrop - a.scoreDrop || b.pathsBroken - a.pathsBroken);
}
