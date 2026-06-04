import { describe, it, expect, vi } from "vitest";
import { mapEngineResults, MultiEngineSerpConnector } from "./multi-engine-connector";
import type { Subject } from "@/lib/types";

const subject: Subject = {
  id: "subj-1", type: "individual", displayName: "Jordan Vance",
  emails: [], phones: [], usernames: [], createdAt: "2026-01-01T00:00:00Z",
};

function jsonResponse(body: unknown): Response {
  return { ok: true, status: 200, json: async () => body } as Response;
}

describe("mapEngineResults", () => {
  it("classifies broker domains as data_broker and others by rank", () => {
    const out = mapEngineResults(
      [
        { position: 1, title: "Listing", link: "https://www.spokeo.com/jordan-vance" },
        { position: 2, title: "Profile", link: "https://medium.com/@jv" },
        { position: 9, title: "Mention", link: "https://forum.example.com/t/123" },
        { title: "no link" },
      ],
      subject,
      "Bing",
    );
    expect(out).toHaveLength(3);
    const broker = out.find((e) => e.source === "data_broker");
    expect(broker?.sourceName).toBe("Spokeo");
    expect(broker?.riskLevel).toBe("high");
    expect(out.find((e) => e.url?.includes("medium"))?.riskLevel).toBe("medium"); // top-3
    expect(out.find((e) => e.url?.includes("forum"))?.riskLevel).toBe("low");      // rank 9
  });
});

describe("MultiEngineSerpConnector", () => {
  it("no-ops without a key (the demo search layer covers it)", async () => {
    const fetchImpl = vi.fn();
    const f = await new MultiEngineSerpConnector(undefined, fetchImpl as unknown as typeof fetch).scan({ subject, existing: [] });
    expect(f.exposures).toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("aggregates across engines and dedupes the same domain", async () => {
    // Every engine returns the same domain → one exposure after dedupe.
    const body = { organic_results: [{ position: 1, title: "Profile", link: "https://medium.com/@jv" }] };
    const ok = new MultiEngineSerpConnector("key", vi.fn(async () => jsonResponse(body)) as unknown as typeof fetch);
    const f = await ok.scan({ subject, existing: [] });
    expect(f.exposures).toHaveLength(1);
  });

  it("skips the sweep (no network) when the budget meter denies", async () => {
    const fetchImpl = vi.fn();
    const c = new MultiEngineSerpConnector("key", fetchImpl as unknown as typeof fetch);
    const f = await c.scan({ subject, existing: [], meter: { consume: async () => false } });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(f.exposures).toEqual([]);
  });

  it("degrades per-engine on error without throwing", async () => {
    const bad = new MultiEngineSerpConnector("key", vi.fn(async () => { throw new Error("net"); }) as unknown as typeof fetch);
    const f = await bad.scan({ subject, existing: [] });
    expect(f.exposures).toEqual([]);
    expect(f.log.every((l) => l.includes("failed"))).toBe(true);
  });
});
