import { describe, expect, it } from "vitest";
import { parseClassification } from "./sentiment-llm";
import { collectReputation, type MentionSource } from "./collect";
import type { LLMProvider } from "@/lib/agents/llm/provider";

describe("LLM sentiment parsing", () => {
  it("parses a JSON array, clamps scores and ignores out-of-range indices", () => {
    const text = 'noise [{"i":0,"label":"positive","score":2},{"i":1,"label":"negative","score":-0.5},{"i":9,"label":"positive","score":1}] trailing';
    const out = parseClassification(text, 2);
    expect(out[0]).toMatchObject({ label: "positive", score: 1 });
    expect(out[1]).toMatchObject({ label: "negative", score: -0.5 });
  });

  it("returns nulls when there is no JSON array (e.g. mock provider output)", () => {
    expect(parseClassification("MOCK_RESPONSE::whatever", 3)).toEqual([null, null, null]);
  });

  it("ignores invalid labels", () => {
    expect(parseClassification('[{"i":0,"label":"angry","score":0}]', 1)).toEqual([null]);
  });
});

const source: MentionSource = {
  async fetch() {
    return {
      live: true,
      mentions: [
        { channel: "news", sourceName: "x", url: "u1", title: "neutral filing", excerpt: "neutral filing", detectedAt: "2026-01-02T00:00:00Z" },
      ],
    };
  },
};

describe("collectReputation with an LLM provider", () => {
  it("uses LLM classification when a non-mock provider is supplied", async () => {
    const provider: LLMProvider = {
      name: "anthropic",
      async complete() {
        return { provider: "anthropic", model: "x", text: '[{"i":0,"label":"negative","score":-0.8}]' };
      },
    };
    const res = await collectReputation({ displayName: "Acme" }, source, { provider });
    expect(res.llmSentiment).toBe(true);
    expect(res.mentions[0].sentiment).toBe("negative"); // LLM overrode the neutral lexicon read
  });

  it("falls back to the lexicon with the mock provider", async () => {
    const provider: LLMProvider = {
      name: "mock",
      async complete() {
        return { provider: "mock", model: "m", text: "MOCK" };
      },
    };
    const res = await collectReputation({ displayName: "Acme" }, source, { provider });
    expect(res.llmSentiment).toBe(false);
  });
});
