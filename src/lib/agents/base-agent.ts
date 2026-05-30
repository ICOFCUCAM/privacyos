/**
 * Base class for every specialized PrivacyOS agent.
 *
 * An agent observes a slice of a subject's footprint and emits two kinds of
 * output: discovered findings (exposures / threats) and recommendations (work
 * the user can approve). Agents are pure with respect to their inputs — they
 * take a context and return results — so the orchestrator can run them
 * concurrently, retry them, and log them deterministically.
 */

import type {
  AgentKind,
  Exposure,
  Recommendation,
  Subject,
  Threat,
} from "@/lib/types";
import type { LLMProvider } from "./llm/provider";

export interface AgentContext {
  subject: Subject;
  /** Existing footprint the agent can reason over. */
  exposures: Exposure[];
  threats: Threat[];
  llm: LLMProvider;
  now: number;
}

export interface AgentResult {
  agent: AgentKind;
  findings: Exposure[];
  threats: Threat[];
  recommendations: Recommendation[];
  log: string[];
}

export abstract class BaseAgent {
  abstract readonly kind: AgentKind;
  abstract readonly name: string;
  abstract readonly description: string;

  /** Run a single cycle of this agent against the given context. */
  abstract run(ctx: AgentContext): Promise<AgentResult>;

  protected empty(): AgentResult {
    return {
      agent: this.kind,
      findings: [],
      threats: [],
      recommendations: [],
      log: [],
    };
  }

  protected rid(prefix: string, ctx: AgentContext, n: number): string {
    return `${prefix}-${this.kind}-${ctx.subject.id}-${n}`;
  }
}
