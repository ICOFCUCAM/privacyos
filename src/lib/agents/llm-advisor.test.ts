import { describe, it, expect } from "vitest";
import { adviseOnPlan, fallbackNarrative, type AdvisorContext } from "./llm-advisor";
import { MockProvider, type LLMProvider, type LLMCompletion } from "./llm/provider";
import type { SynthesizedRecommendation } from "./synthesis";

const ctx: AdvisorContext = { subjectName: "Jordan Vance", exposureScore: 95, threatLevel: "critical", activeThreats: 2 };

const synth = (over: Partial<SynthesizedRecommendation>): SynthesizedRecommendation => ({
  id: "r1", subjectId: "s1", agent: "security", title: "Rotate exposed credentials now",
  rationale: "", riskLevel: "critical", impact: 18, actionLabel: "Start",
  corroboratingAgents: ["security"], confidence: 0.9, priority: 48.6, mergedCount: 1, ...over,
});

/** A fake real provider returning canned JSON. */
class FakeLLM implements LLMProvider {
  readonly name = "anthropic";
  constructor(private payload: string) {}
  async complete(): Promise<LLMCompletion> {
    return { text: this.payload, provider: this.name, model: "test" };
  }
}

describe("fallbackNarrative", () => {
  it("summarizes the lead action", () => {
    const out = fallbackNarrative(ctx, [synth({})]);
    expect(out.source).toBe("fallback");
    expect(out.summary).toContain("Jordan Vance");
    expect(out.rationale).toContain("Rotate exposed credentials now");
  });

  it("handles an empty plan (monitoring mode)", () => {
    const out = fallbackNarrative(ctx, []);
    expect(out.summary).toMatch(/no open actions/i);
    expect(out.rationale).toMatch(/monitoring/i);
  });
});

describe("adviseOnPlan", () => {
  it("uses the deterministic fallback for the mock provider", async () => {
    const out = await adviseOnPlan(new MockProvider(), ctx, [synth({})]);
    expect(out.source).toBe("fallback");
  });

  it("parses strict JSON from a real provider", async () => {
    const llm = new FakeLLM('{"summary":"Critical exposure.","rationale":"Rotate first."}');
    const out = await adviseOnPlan(llm, ctx, [synth({})]);
    expect(out.source).toBe("llm");
    expect(out.summary).toBe("Critical exposure.");
    expect(out.rationale).toBe("Rotate first.");
    expect(out.provider).toBe("anthropic");
  });

  it("extracts JSON even when wrapped in prose / code fences", async () => {
    const llm = new FakeLLM('Here:\n```json\n{"summary":"S","rationale":"R"}\n```');
    const out = await adviseOnPlan(llm, ctx, [synth({})]);
    expect(out.source).toBe("llm");
    expect(out.summary).toBe("S");
  });

  it("falls back when the provider returns unparseable output", async () => {
    const out = await adviseOnPlan(new FakeLLM("not json at all"), ctx, [synth({})]);
    expect(out.source).toBe("fallback");
  });

  it("falls back when the provider throws", async () => {
    const thrower: LLMProvider = {
      name: "openai",
      async complete() { throw new Error("rate limited"); },
    };
    const out = await adviseOnPlan(thrower, ctx, [synth({})]);
    expect(out.source).toBe("fallback");
  });
});
