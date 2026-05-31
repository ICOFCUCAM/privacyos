/**
 * LLM-backed sentiment classification.
 *
 * Batches all headlines into a single provider call for efficiency and returns
 * one result per input (or null when a line couldn't be classified, so the
 * caller falls back to the lexicon analyzer). The mock provider's output won't
 * parse as JSON, so without a real key this transparently yields nulls →
 * lexicon. Parsing is pure and unit-tested.
 */

import type { LLMProvider } from "@/lib/agents/llm/provider";
import type { SentimentLabel } from "@/lib/suite-types";
import type { SentimentResult } from "./sentiment";

const LABELS: SentimentLabel[] = ["positive", "neutral", "negative", "mixed"];
const clamp = (n: number) => Math.max(-1, Math.min(1, n));

/** Extract and parse the JSON classification array from a model response. */
export function parseClassification(text: string, n: number): (SentimentResult | null)[] {
  const out: (SentimentResult | null)[] = Array(n).fill(null);
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end <= start) return out;
  try {
    const arr = JSON.parse(text.slice(start, end + 1)) as Array<{ i?: number; label?: string; score?: number }>;
    for (const item of arr) {
      const i = item.i;
      if (typeof i === "number" && i >= 0 && i < n && LABELS.includes(item.label as SentimentLabel)) {
        out[i] = {
          label: item.label as SentimentLabel,
          score: Number(clamp(Number(item.score) || 0).toFixed(3)),
          positiveHits: 0,
          negativeHits: 0,
        };
      }
    }
  } catch {
    /* leave nulls → lexicon fallback */
  }
  return out;
}

export async function classifyMentionsLLM(
  texts: string[],
  provider: LLMProvider,
): Promise<(SentimentResult | null)[]> {
  if (texts.length === 0) return [];
  const numbered = texts.map((t, i) => `${i}: ${t.replace(/\s+/g, " ").slice(0, 240)}`).join("\n");
  try {
    const res = await provider.complete(
      [
        {
          role: "system",
          content:
            "You are a precise media-sentiment classifier. Judge sentiment toward the subject of each numbered headline.",
        },
        {
          role: "user",
          content:
            'Classify every line. Respond with ONLY a JSON array of ' +
            '{"i": <line number>, "label": "positive"|"neutral"|"negative"|"mixed", "score": <number -1..1>}.\n\n' +
            numbered,
        },
      ],
      { json: true },
    );
    return parseClassification(res.text, texts.length);
  } catch {
    return texts.map(() => null);
  }
}
