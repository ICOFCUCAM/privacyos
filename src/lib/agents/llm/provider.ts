/**
 * LLM provider abstraction for the agent layer.
 *
 * Agents never talk to a vendor SDK directly — they depend on this interface.
 * That keeps the orchestration layer provider-agnostic (Claude, OpenAI, or a
 * deterministic mock) and makes the whole platform runnable with zero API keys
 * during development, which is essential for CI and local demos.
 */

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMCompletion {
  text: string;
  provider: string;
  model: string;
}

export interface LLMProvider {
  readonly name: string;
  complete(messages: LLMMessage[], opts?: { json?: boolean }): Promise<LLMCompletion>;
}

/**
 * Deterministic, offline provider. Returns structured, plausible output so the
 * agent pipeline is exercisable end-to-end without network or keys. Real
 * providers below replace it when credentials are present.
 */
export class MockProvider implements LLMProvider {
  readonly name = "mock";

  async complete(messages: LLMMessage[]): Promise<LLMCompletion> {
    const last = messages.at(-1)?.content ?? "";
    return {
      provider: this.name,
      model: "mock-deterministic-1",
      text: `MOCK_RESPONSE::${last.slice(0, 120)}`,
    };
  }
}

/** Anthropic Claude provider. Lazy-loads the SDK so it stays an optional dep. */
export class AnthropicProvider implements LLMProvider {
  readonly name = "anthropic";
  constructor(
    private apiKey: string,
    private model = "claude-sonnet-4-6",
  ) {}

  async complete(
    messages: LLMMessage[],
    opts?: { json?: boolean },
  ): Promise<LLMCompletion> {
    const system = messages.find((m) => m.role === "system")?.content;
    const turns = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content }));

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 2048,
        system: opts?.json
          ? `${system ?? ""}\nRespond with valid JSON only.`
          : system,
        messages: turns,
      }),
    });
    if (!res.ok) throw new Error(`Anthropic error ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { content: { text: string }[] };
    return {
      provider: this.name,
      model: this.model,
      text: data.content.map((c) => c.text).join(""),
    };
  }
}

/** OpenAI provider via the Chat Completions REST API. */
export class OpenAIProvider implements LLMProvider {
  readonly name = "openai";
  constructor(
    private apiKey: string,
    private model = "gpt-4o",
  ) {}

  async complete(
    messages: LLMMessage[],
    opts?: { json?: boolean },
  ): Promise<LLMCompletion> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        response_format: opts?.json ? { type: "json_object" } : undefined,
      }),
    });
    if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as {
      choices: { message: { content: string } }[];
    };
    return {
      provider: this.name,
      model: this.model,
      text: data.choices[0]?.message.content ?? "",
    };
  }
}

/** Selects a provider from environment configuration, defaulting to mock. */
export function resolveProvider(
  env: Record<string, string | undefined> = process.env,
): LLMProvider {
  const pref = (env.PRIVACYOS_LLM_PROVIDER ?? "").toLowerCase().trim();

  // Explicit, valid preference with a matching key.
  if (pref === "anthropic" && env.ANTHROPIC_API_KEY) {
    return new AnthropicProvider(env.ANTHROPIC_API_KEY);
  }
  if (pref === "openai" && env.OPENAI_API_KEY) {
    return new OpenAIProvider(env.OPENAI_API_KEY);
  }
  // Any other case (unset, "mock", or an unrecognized/misspelled value): if a
  // key is present, auto-detect rather than silently downgrading to mock — a
  // misconfigured preference should never waste a configured key.
  if (env.ANTHROPIC_API_KEY) return new AnthropicProvider(env.ANTHROPIC_API_KEY);
  if (env.OPENAI_API_KEY) return new OpenAIProvider(env.OPENAI_API_KEY);
  return new MockProvider();
}
