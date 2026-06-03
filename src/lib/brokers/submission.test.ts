import { describe, it, expect, vi } from "vitest";
import { submitRemoval } from "./submission";

const input = { brokerName: "Spokeo", subject: { displayName: "Jordan Avery", emails: ["j@x.com"] } };

describe("broker removal submission", () => {
  it("is an honest no-op when no provider is configured", async () => {
    const r = await submitRemoval(input, { env: {} });
    expect(r.live).toBe(false);
    expect(r.submitted).toBe(false);
    expect(r.reference).toMatch(/^sim-spokeo/);
    expect(r.note).toMatch(/Simulated/);
  });

  it("files a real opt-out when configured, returning the provider reference", async () => {
    const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) =>
      new Response(JSON.stringify({ reference: "OR-12345" }), { status: 200 }));
    const r = await submitRemoval(input, {
      env: { BROKER_REMOVAL_API_KEY: "k", BROKER_REMOVAL_ENDPOINT: "https://api.removal.test/optout" },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(r.live).toBe(true);
    expect(r.submitted).toBe(true);
    expect(r.reference).toBe("OR-12345");
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(fetchImpl.mock.calls[0][1]?.method).toBe("POST");
  });

  it("degrades gracefully (never throws) when the provider fails", async () => {
    const fetchImpl = vi.fn(async () => new Response("err", { status: 500 }));
    const r = await submitRemoval(input, {
      env: { BROKER_REMOVAL_API_KEY: "k", BROKER_REMOVAL_ENDPOINT: "https://api.removal.test/optout" },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(r.live).toBe(false);
    expect(r.submitted).toBe(false);
    expect(r.note).toMatch(/unreachable/);
  });
});
