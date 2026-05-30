/**
 * Sentiment analysis.
 *
 * A real, deterministic lexicon-based analyzer — no API key, no network, fully
 * unit-tested. It scores text in [-1, 1] with simple negation handling and maps
 * to a label. This is genuine computation (not seeded values); an LLM-based
 * analyzer can later implement the same `analyzeSentiment` contract for nuance,
 * but the lexicon baseline guarantees the feature always works.
 */

import type { SentimentLabel } from "@/lib/suite-types";

const POSITIVE = new Set([
  "good", "great", "excellent", "positive", "success", "successful", "win", "wins", "award",
  "awarded", "growth", "strong", "praise", "praised", "innovative", "leader", "leading", "trust",
  "trusted", "confidence", "milestone", "record", "celebrated", "honored", "thriving", "boost",
  "breakthrough", "acclaimed", "promising", "impressive", "popular", "love", "loved",
]);

const NEGATIVE = new Set([
  "bad", "poor", "negative", "fail", "failed", "failure", "lawsuit", "sued", "fraud", "scandal",
  "scam", "breach", "leak", "leaked", "hack", "hacked", "attack", "criticism", "criticized",
  "controversy", "controversial", "allegation", "alleged", "investigation", "fine", "fined",
  "penalty", "decline", "drop", "loss", "losses", "crisis", "defamation", "defamatory", "fake",
  "harassment", "threat", "danger", "exposed", "victim", "complaint", "complaints", "outrage", "shady",
]);

const NEGATORS = new Set(["not", "no", "never", "without", "lacks", "lacking", "hardly", "barely"]);

export interface SentimentResult {
  label: SentimentLabel;
  /** Net sentiment in [-1, 1]. */
  score: number;
  positiveHits: number;
  negativeHits: number;
}

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
}

export function analyzeSentiment(text: string): SentimentResult {
  const tokens = tokenize(text);
  let pos = 0;
  let neg = 0;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const negated = i > 0 && NEGATORS.has(tokens[i - 1]);
    if (POSITIVE.has(t)) negated ? neg++ : pos++;
    else if (NEGATIVE.has(t)) negated ? pos++ : neg++;
  }
  const total = pos + neg;
  const score = total === 0 ? 0 : Number(((pos - neg) / total).toFixed(3));

  let label: SentimentLabel;
  if (total === 0) label = "neutral";
  else if (pos > 0 && neg > 0 && Math.abs(score) <= 0.34) label = "mixed";
  else if (score > 0.34) label = "positive";
  else if (score < -0.34) label = "negative";
  else label = "neutral";

  return { label, score, positiveHits: pos, negativeHits: neg };
}

/** Aggregate a set of sentiment scores into a daily net figure in [-1, 1]. */
export function netSentiment(scores: number[]): number {
  if (scores.length === 0) return 0;
  return Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(3));
}
