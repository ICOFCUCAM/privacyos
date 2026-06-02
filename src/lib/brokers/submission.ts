/**
 * Broker opt-out submission connector.
 *
 * The honest seam behind "we file removal requests". When a removal provider is
 * configured (`BROKER_REMOVAL_API_KEY` + `BROKER_REMOVAL_ENDPOINT`, e.g. an
 * Onerep/DeleteMe-style API), this POSTs a real opt-out and returns a live
 * reference. With no key it is a transparent no-op that reports
 * `live: false` — so the rest of the system, and the UI, can say plainly when a
 * removal is *actually filed* vs *simulated*. Fetch + env are injectable; pure
 * and unit-tested.
 */

import { fetchJsonWithTimeout } from "@/lib/net/keyed-fetch";

export interface SubmitRemovalInput {
  brokerName: string;
  /** What we're asking the broker to remove. */
  subject: { displayName: string; emails?: string[] };
}

export interface SubmitRemovalResult {
  /** True only when a real opt-out was filed with a configured provider. */
  live: boolean;
  submitted: boolean;
  /** Provider reference id when live; a synthetic marker otherwise. */
  reference: string;
  note: string;
}

export interface SubmitRemovalDeps {
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

/**
 * File (or simulate) a broker opt-out. Never throws — a provider failure
 * degrades to a non-live result so the removal pipeline keeps moving and the UI
 * can disclose the truth.
 */
export async function submitRemoval(
  input: SubmitRemovalInput,
  deps: SubmitRemovalDeps = {},
): Promise<SubmitRemovalResult> {
  const env = deps.env ?? process.env;
  const apiKey = env.BROKER_REMOVAL_API_KEY;
  const endpoint = env.BROKER_REMOVAL_ENDPOINT;

  // No provider configured → honest no-op.
  if (!apiKey || !endpoint) {
    return {
      live: false,
      submitted: false,
      reference: `sim-${slug(input.brokerName)}`,
      note: "Simulated — no removal provider configured.",
    };
  }

  try {
    const data = await fetchJsonWithTimeout<{ id?: string; reference?: string }>(endpoint, {
      label: "broker-removal",
      timeoutMs: deps.timeoutMs ?? 8000,
      fetchImpl: deps.fetchImpl,
      init: {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          broker: input.brokerName,
          name: input.subject.displayName,
          emails: input.subject.emails ?? [],
        }),
      },
    });
    const reference = data.reference ?? data.id ?? `ref-${slug(input.brokerName)}`;
    return { live: true, submitted: true, reference, note: "Opt-out filed with the broker." };
  } catch {
    return {
      live: false,
      submitted: false,
      reference: `failed-${slug(input.brokerName)}`,
      note: "Removal provider unreachable — will retry on the next cycle.",
    };
  }
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
