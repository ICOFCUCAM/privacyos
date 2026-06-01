/**
 * Reputation → Case routing.
 *
 * Strong negative or defamatory coverage is real remediation work: it should
 * auto-open a tracked reputation-recovery case assigned to the Reputation Agent,
 * so the recovery/suppression workflows fire autonomously from the protection
 * cycle instead of waiting for someone to open the page. Pure and unit-tested.
 */

import type { RiskLevel } from "@/lib/types";
import type { SentimentLabel } from "@/lib/suite-types";
import type { NewCaseFields } from "@/lib/agents/recommendation-routing";
import { suppressionTactics } from "./recovery";

export interface ReputationMentionLike {
  title: string;
  sourceName: string;
  sentiment: SentimentLabel;
  sentimentScore: number;
  isDefamatory: boolean;
  searchRank?: number;
}

/** Defamatory, or strongly negative coverage, warrants a recovery case. */
export function shouldOpenReputationCase(m: ReputationMentionLike): boolean {
  return m.isDefamatory || (m.sentiment === "negative" && m.sentimentScore <= -0.6);
}

function severityFor(m: ReputationMentionLike): RiskLevel {
  if (m.isDefamatory) return m.searchRank && m.searchRank <= 3 ? "critical" : "high";
  return m.sentimentScore <= -0.8 ? "high" : "medium";
}

export function caseFromMention(m: ReputationMentionLike): NewCaseFields {
  const defamatory = m.isDefamatory;
  // Attach the generated recovery plan so the case opens to ready-to-run steps.
  const plan = suppressionTactics(defamatory)
    .map((t, i) => `${i + 1}. ${t}`)
    .join(" ");
  return {
    type: "reputation_recovery",
    title: `${defamatory ? "Defamatory content" : "Negative coverage"}: ${m.title}`,
    summary: `${defamatory ? "Defamatory" : "Negative"} mention on ${m.sourceName}. Recovery plan — ${plan} Then monitor rank recovery.`,
    riskLevel: severityFor(m),
    assignedAgent: "reputation",
  };
}

/**
 * From a batch of mentions, the reputation cases to open: defamatory/strong-
 * negative only, de-duplicated within the batch and against existing open
 * case titles.
 */
export function reputationCasesFromMentions(
  mentions: ReputationMentionLike[],
  existingOpenTitles: Iterable<string> = [],
): NewCaseFields[] {
  const seen = new Set<string>(existingOpenTitles);
  const out: NewCaseFields[] = [];
  for (const m of mentions) {
    if (!shouldOpenReputationCase(m)) continue;
    const c = caseFromMention(m);
    if (seen.has(c.title)) continue;
    seen.add(c.title);
    out.push(c);
  }
  return out;
}
