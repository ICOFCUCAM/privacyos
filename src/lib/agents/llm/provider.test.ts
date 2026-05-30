import { describe, expect, it } from "vitest";
import { resolveProvider } from "./provider";

describe("resolveProvider", () => {
  it("uses mock when no keys are present", () => {
    expect(resolveProvider({}).name).toBe("mock");
  });

  it("honors an explicit, valid preference", () => {
    expect(resolveProvider({ PRIVACYOS_LLM_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "k" }).name).toBe("anthropic");
    expect(resolveProvider({ PRIVACYOS_LLM_PROVIDER: "openai", OPENAI_API_KEY: "k" }).name).toBe("openai");
  });

  it("auto-detects from an available key when the preference is unset", () => {
    expect(resolveProvider({ ANTHROPIC_API_KEY: "k" }).name).toBe("anthropic");
    expect(resolveProvider({ OPENAI_API_KEY: "k" }).name).toBe("openai");
  });

  it("does not downgrade to mock on a misspelled/invalid preference when a key exists", () => {
    // e.g. the placeholder "anthropic_or_openai" with an Anthropic key set
    expect(resolveProvider({ PRIVACYOS_LLM_PROVIDER: "anthropic_or_openai", ANTHROPIC_API_KEY: "k" }).name).toBe("anthropic");
  });

  it("is case/whitespace tolerant", () => {
    expect(resolveProvider({ PRIVACYOS_LLM_PROVIDER: " Anthropic ", ANTHROPIC_API_KEY: "k" }).name).toBe("anthropic");
  });
});
