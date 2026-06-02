import { describe, it, expect } from "vitest";
import { dedupeKey } from "./source";

describe("discovery dedupeKey", () => {
  it("is stable and case-insensitive across source/name/snippet", () => {
    const a = dedupeKey({ source: "data_broker", sourceName: "Spokeo", snippet: "Home address" });
    const b = dedupeKey({ source: "data_broker", sourceName: "SPOKEO", snippet: "home address" });
    expect(a).toBe(b);
  });

  it("distinguishes different findings", () => {
    const a = dedupeKey({ source: "data_broker", sourceName: "Spokeo", snippet: "x" });
    const b = dedupeKey({ source: "data_broker", sourceName: "Whitepages", snippet: "x" });
    expect(a).not.toBe(b);
  });
});
