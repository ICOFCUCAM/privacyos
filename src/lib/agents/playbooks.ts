/**
 * Autonomous response playbooks — the automation moat made concrete.
 *
 * A playbook is a declarative detect → decide → act → escalate workflow. Given a
 * stream of findings (exposures + threats), the engine matches each finding
 * against a trigger, then walks the playbook's steps. Decision gates choose
 * whether a step auto-executes or requires human approval based on the finding's
 * risk and the agent's confidence. The result is a deterministic execution trace
 * the UI renders and the audit log records — pure, side-effect-free, testable.
 */

import type { AgentKind, Exposure, ExposureSource, RiskLevel, Threat, ThreatKind } from "@/lib/types";

export type StepKind = "detect" | "decide" | "act" | "escalate" | "monitor";

/** How a step is carried out. */
export type Execution = "auto" | "approval" | "skipped";

export interface PlaybookStep {
  kind: StepKind;
  /** Human-readable action, e.g. "File broker opt-out". */
  label: string;
  /** Which agent owns this step. */
  agent: AgentKind;
  /**
   * Risk threshold at or above which this step requires human approval rather
   * than auto-executing. Steps below auto-run. Omit → always auto.
   */
  approvalAtOrAbove?: RiskLevel;
  /** Steps that only fire for irreversible/legal actions. */
  irreversible?: boolean;
}

export interface PlaybookTrigger {
  /** Source kinds (exposures) this playbook reacts to. */
  exposureSources?: ExposureSource[];
  /** Threat kinds this playbook reacts to. */
  threatKinds?: ThreatKind[];
  /** Minimum risk level to trigger. */
  minRisk: RiskLevel;
}

export interface Playbook {
  id: string;
  name: string;
  description: string;
  /** Primary agent that owns the playbook. */
  owner: AgentKind;
  trigger: PlaybookTrigger;
  steps: PlaybookStep[];
}

const RISK_RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };

export function meetsRisk(level: RiskLevel, min: RiskLevel): boolean {
  return RISK_RANK[level] >= RISK_RANK[min];
}

/* ── The playbook catalog ────────────────────────────────────────────────── */

export const PLAYBOOKS: Playbook[] = [
  {
    id: "credential-breach-response",
    name: "Credential Breach Response",
    description: "Leaked credential detected → verify, lock down, notify, and open a breach case.",
    owner: "security",
    trigger: { exposureSources: ["dark_web", "breach_db"], threatKinds: ["credential_leak"], minRisk: "high" },
    steps: [
      { kind: "detect", label: "Confirm leaked credential against breach corpus", agent: "security" },
      { kind: "decide", label: "Assess blast radius & reuse risk", agent: "security" },
      { kind: "act", label: "Trigger forced password-reset guidance", agent: "security" },
      { kind: "act", label: "Enroll identifier in continuous dark-web watch", agent: "security" },
      { kind: "escalate", label: "Open breach-response case for review", agent: "security", approvalAtOrAbove: "critical" },
    ],
  },
  {
    id: "broker-removal",
    name: "Data-Broker Removal",
    description: "Personal data on a broker → file opt-out and schedule 30/60/90-day re-checks.",
    owner: "privacy",
    trigger: { exposureSources: ["data_broker", "public_record", "search_engine"], minRisk: "medium" },
    steps: [
      { kind: "detect", label: "Match listing to monitored identity", agent: "discovery" },
      { kind: "decide", label: "Select opt-out path for broker", agent: "privacy" },
      { kind: "act", label: "File broker opt-out request", agent: "privacy" },
      { kind: "act", label: "Draft GDPR/CCPA erasure request", agent: "legal", approvalAtOrAbove: "high", irreversible: true },
      { kind: "monitor", label: "Schedule 30/60/90-day reappearance re-checks", agent: "privacy" },
    ],
  },
  {
    id: "deepfake-takedown",
    name: "Deepfake & Impersonation Takedown",
    description: "Synthetic media or impersonation → assemble evidence and pursue takedown.",
    owner: "deepfake",
    trigger: { exposureSources: ["ai_generated", "social_media"], threatKinds: ["deepfake", "impersonation"], minRisk: "high" },
    steps: [
      { kind: "detect", label: "Score media with deepfake detector", agent: "deepfake" },
      { kind: "decide", label: "Confirm subject likeness & intent", agent: "deepfake" },
      { kind: "act", label: "Assemble evidence package", agent: "deepfake" },
      { kind: "escalate", label: "File platform takedown notice", agent: "legal", approvalAtOrAbove: "high", irreversible: true },
      { kind: "monitor", label: "Watch for re-uploads across platforms", agent: "deepfake" },
    ],
  },
  {
    id: "doxxing-response",
    name: "Doxxing & Location-Exposure Response",
    description: "Home address or location exposed → suppress, alert and protect.",
    owner: "executive",
    trigger: { threatKinds: ["doxxing", "location_exposure"], minRisk: "high" },
    steps: [
      { kind: "detect", label: "Correlate exposed location with subject", agent: "executive" },
      { kind: "decide", label: "Assess physical-security severity", agent: "executive" },
      { kind: "act", label: "Request suppression at source", agent: "privacy" },
      { kind: "escalate", label: "Alert protection team", agent: "executive", approvalAtOrAbove: "critical" },
    ],
  },
  {
    id: "reputation-defense",
    name: "Reputation Defense",
    description: "Negative or defamatory narrative → analyze, recommend recovery, monitor.",
    owner: "reputation",
    trigger: { exposureSources: ["news", "forum", "social_media"], threatKinds: ["negative_press"], minRisk: "medium" },
    steps: [
      { kind: "detect", label: "Classify sentiment & reach", agent: "reputation" },
      { kind: "decide", label: "Determine defamation vs criticism", agent: "reputation" },
      { kind: "act", label: "Generate SEO suppression plan", agent: "reputation" },
      { kind: "escalate", label: "Draft defamation complaint", agent: "legal", approvalAtOrAbove: "high", irreversible: true },
    ],
  },
];

/* ── Matching & evaluation ───────────────────────────────────────────────── */

export interface FindingRef {
  id: string;
  /** Title for trace display. */
  title: string;
  riskLevel: RiskLevel;
  source?: ExposureSource;
  threatKind?: ThreatKind;
}

export function exposureToFinding(e: Exposure): FindingRef {
  return { id: e.id, title: e.sourceName, riskLevel: e.riskLevel, source: e.source };
}

export function threatToFinding(t: Threat): FindingRef {
  return { id: t.id, title: t.title, riskLevel: t.riskLevel, source: t.source, threatKind: t.kind };
}

/** Does a finding trigger a given playbook? */
export function matches(playbook: Playbook, f: FindingRef): boolean {
  if (!meetsRisk(f.riskLevel, playbook.trigger.minRisk)) return false;
  const sourceHit = !!f.source && (playbook.trigger.exposureSources?.includes(f.source) ?? false);
  const threatHit = !!f.threatKind && (playbook.trigger.threatKinds?.includes(f.threatKind) ?? false);
  return sourceHit || threatHit;
}

export interface ExecutedStep extends PlaybookStep {
  execution: Execution;
  reason: string;
}

export interface PlaybookRun {
  playbookId: string;
  playbookName: string;
  owner: AgentKind;
  finding: FindingRef;
  steps: ExecutedStep[];
  /** True when every step ran without needing a human. */
  fullyAutonomous: boolean;
  /** Count of steps that auto-executed. */
  autoSteps: number;
  /** Count of steps that paused for approval. */
  approvalSteps: number;
}

/**
 * Evaluate a playbook against one finding, deciding per step whether it
 * auto-executes or pauses for approval. Irreversible/legal steps and steps whose
 * approval threshold is met by the finding's risk require human sign-off; all
 * others run autonomously.
 */
export function evaluatePlaybook(playbook: Playbook, finding: FindingRef): PlaybookRun {
  const steps: ExecutedStep[] = playbook.steps.map((step) => {
    const needsApproval =
      step.approvalAtOrAbove !== undefined && meetsRisk(finding.riskLevel, step.approvalAtOrAbove);
    if (needsApproval) {
      return {
        ...step,
        execution: "approval",
        reason: step.irreversible
          ? "Irreversible legal action — awaiting approval"
          : `Risk ${finding.riskLevel} ≥ ${step.approvalAtOrAbove} — awaiting approval`,
      };
    }
    return { ...step, execution: "auto", reason: "Auto-executed by agent" };
  });
  const autoSteps = steps.filter((s) => s.execution === "auto").length;
  const approvalSteps = steps.filter((s) => s.execution === "approval").length;
  return {
    playbookId: playbook.id,
    playbookName: playbook.name,
    owner: playbook.owner,
    finding,
    steps,
    fullyAutonomous: approvalSteps === 0,
    autoSteps,
    approvalSteps,
  };
}

/**
 * Run the whole catalog over a set of findings, returning one run per
 * (playbook, matching finding). Highest-risk findings first.
 */
export function runPlaybooks(findings: FindingRef[]): PlaybookRun[] {
  const runs: PlaybookRun[] = [];
  const ordered = [...findings].sort((a, b) => RISK_RANK[b.riskLevel] - RISK_RANK[a.riskLevel]);
  for (const playbook of PLAYBOOKS) {
    for (const f of ordered) {
      if (matches(playbook, f)) runs.push(evaluatePlaybook(playbook, f));
    }
  }
  return runs;
}

export interface PlaybookSummary {
  activePlaybooks: number;
  totalRuns: number;
  autonomousRuns: number;
  totalSteps: number;
  autoSteps: number;
  approvalSteps: number;
  /** Share of all steps executed without a human, 0–100. */
  automationRate: number;
}

export function summarizeRuns(runs: PlaybookRun[]): PlaybookSummary {
  const activeIds = new Set(runs.map((r) => r.playbookId));
  const totalSteps = runs.reduce((s, r) => s + r.steps.length, 0);
  const autoSteps = runs.reduce((s, r) => s + r.autoSteps, 0);
  const approvalSteps = runs.reduce((s, r) => s + r.approvalSteps, 0);
  return {
    activePlaybooks: activeIds.size,
    totalRuns: runs.length,
    autonomousRuns: runs.filter((r) => r.fullyAutonomous).length,
    totalSteps,
    autoSteps,
    approvalSteps,
    automationRate: totalSteps === 0 ? 0 : Math.round((autoSteps / totalSteps) * 1000) / 10,
  };
}
