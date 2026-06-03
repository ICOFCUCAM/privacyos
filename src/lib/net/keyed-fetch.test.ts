import { describe, it, expect, vi } from "vitest";
import { fetchJsonWithTimeout } from "./keyed-fetch";

const res = (over: Partial<Response> & { json?: () => Promise<unknown> }): Response => ({ ok: true, status: 200, json: async () => ({}), ...over }) as Response;

describe("fetchJsonWithTimeout", () => {
  it("returns parsed JSON on a 2xx response and passes init + signal", async () => {
    const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) => res({ json: async () => ({ hello: "world" }) }));
    const data = await fetchJsonWithTimeout<{ hello: string }>("https://x.test", {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      init: { method: "POST", headers: { "X-Y": "1" } },
    });
    expect(data.hello).toBe("world");
    const init = fetchImpl.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("throws (labelled) on a non-2xx response", async () => {
    const fetchImpl = vi.fn(async () => res({ ok: false, status: 503 }));
    await expect(
      fetchJsonWithTimeout("https://x.test", { fetchImpl: fetchImpl as unknown as typeof fetch, label: "Provider" }),
    ).rejects.toThrow(/Provider 503/);
  });

  it("propagates network errors", async () => {
    const fetchImpl = vi.fn(async () => { throw new Error("offline"); });
    await expect(
      fetchJsonWithTimeout("https://x.test", { fetchImpl: fetchImpl as unknown as typeof fetch }),
    ).rejects.toThrow(/offline/);
  });
});
