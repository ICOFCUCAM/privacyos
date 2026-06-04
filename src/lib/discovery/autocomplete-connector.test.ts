import { describe, it, expect, vi } from "vitest";
import {
  defamatoryKeyword,
  classifyAutocomplete,
  simulateAutocomplete,
  AutocompleteConnector,
} from "./autocomplete-connector";
import type { Subject } from "@/lib/types";

const subject: Subject = {
  id: "subj-1", type: "individual", displayName: "Jordan Vance",
  emails: [], phones: [], usernames: [], createdAt: "2026-01-01T00:00:00Z",
};

function jsonResponse(body: unknown): Response {
  return { ok: true, status: 200, json: async () => body } as Response;
}

describe("defamatoryKeyword", () => {
  it("matches damaging words on word boundaries, not benign ones", () => {
    expect(defamatoryKeyword("Jordan Vance scam")).toBe("scam");
    expect(defamatoryKeyword("Jordan Vance lawsuit")).toBe("lawsuit");
    expect(defamatoryKeyword("Jordan Vance net worth")).toBeNull();
    expect(defamatoryKeyword("Jordan Vance scampi recipe")).toBeNull(); // boundary: not "scam"
  });
});

describe("classifyAutocomplete", () => {
  it("emits a threat + exposure per damaging suggestion and skips benign ones", () => {
    const f = classifyAutocomplete(
      ["Jordan Vance net worth", "Jordan Vance fraud", "Jordan Vance wikipedia"],
      subject,
    );
    expect(f.exposures).toHaveLength(1);
    expect(f.threats).toHaveLength(1);
    expect(f.threats[0]).toMatchObject({ kind: "negative_press", riskLevel: "high" });
    expect(f.exposures[0].sourceName).toBe("Google Autocomplete");
  });

  it("dedupes repeated suggestions", () => {
    const f = classifyAutocomplete(["X scam", "x scam ", "X SCAM"], subject);
    expect(f.threats).toHaveLength(1);
  });
});

describe("simulateAutocomplete", () => {
  it("returns deterministic findings for the same subject", () => {
    const a = simulateAutocomplete(subject);
    const b = simulateAutocomplete(subject);
    expect(a.threats.map((t) => t.id)).toEqual(b.threats.map((t) => t.id));
  });
});

describe("AutocompleteConnector", () => {
  it("uses the offline simulator when no key is set", async () => {
    const f = await new AutocompleteConnector(undefined).scan({ subject, existing: [] });
    expect(f.log[0]).toContain("suggestion");
  });

  it("classifies live suggestions when keyed", async () => {
    const body = { suggestions: [{ value: "Jordan Vance scam" }, { value: "Jordan Vance bio" }] };
    const ok = new AutocompleteConnector("key", vi.fn(async () => jsonResponse(body)) as unknown as typeof fetch);
    const f = await ok.scan({ subject, existing: [] });
    expect(f.threats).toHaveLength(1);
    expect(f.threats[0].title).toContain("scam");
  });

  it("skips the call when the budget meter denies", async () => {
    const fetchImpl = vi.fn();
    const f = await new AutocompleteConnector("key", fetchImpl as unknown as typeof fetch)
      .scan({ subject, existing: [], meter: { consume: async () => false } });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(f.threats).toEqual([]);
  });

  it("degrades silently on network error", async () => {
    const bad = new AutocompleteConnector("key", vi.fn(async () => { throw new Error("net"); }) as unknown as typeof fetch);
    const f = await bad.scan({ subject, existing: [] });
    expect(f.exposures).toEqual([]);
    expect(f.log.some((l) => l.includes("failed"))).toBe(true);
  });
});
