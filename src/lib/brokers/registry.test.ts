import { describe, it, expect } from "vitest";
import { BROKERS, findBroker } from "./registry";

describe("broker registry", () => {
  it("is a non-empty catalog with unique ids and valid fields", () => {
    expect(BROKERS.length).toBeGreaterThan(10);
    const ids = new Set(BROKERS.map((b) => b.id));
    expect(ids.size).toBe(BROKERS.length); // unique
    for (const b of BROKERS) {
      expect(b.name.length).toBeGreaterThan(0);
      expect(b.avgDays).toBeGreaterThan(0);
      expect(["form", "email", "api"]).toContain(b.method);
    }
  });

  it("resolves brokers by name, case-insensitively", () => {
    const first = BROKERS[0];
    expect(findBroker(first.name)?.id).toBe(first.id);
    expect(findBroker(first.name.toUpperCase())?.id).toBe(first.id);
    expect(findBroker("definitely-not-a-broker")).toBeUndefined();
  });
});
