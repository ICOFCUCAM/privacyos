import { describe, it, expect } from "vitest";
import { runDiscovery, defaultDiscoverySources } from "./pipeline";
import { entitlementsFor, FREE_ENTITLEMENTS } from "@/lib/billing/entitlements";
import type { DiscoverySource, DiscoveryInput, DiscoveryFinding } from "./source";
import type { Subject, Exposure, Threat } from "@/lib/types";

const subject: Subject = {
  id: "s1", type: "individual", displayName: "Jordan Avery", emails: ["jordan@acme.com"],
  phones: [], usernames: [], organization: "Acme", createdAt: "2026-01-01T00:00:00Z",
};

const exposure = (id: string, sourceName: string): Exposure => ({
  id, subjectId: "s1", category: "email", source: "search_engine", sourceName, snippet: "",
  riskLevel: "medium", riskScore: 10, status: "monitoring", discoveredAt: "2026-01-01T00:00:00Z", lastSeenAt: "2026-01-01T00:00:00Z",
});

const fakeSource = (id: string, finding: Partial<DiscoveryFinding>, throws = false): DiscoverySource => ({
  id, name: id,
  async scan(_input: DiscoveryInput): Promise<DiscoveryFinding> {
    if (throws) throw new Error("boom");
    return { exposures: [], threats: [], log: [], ...finding };
  },
});

const input: DiscoveryInput = { subject, existing: [], existingThreats: [] };

describe("discovery pipeline", () => {
  it("isolates a failing source and still returns the others' findings", async () => {
    const result = await runDiscovery(input, [
      fakeSource("ok", { exposures: [exposure("e1", "Whitepages")], log: ["found 1"] }),
      fakeSource("bad", {}, true),
    ]);
    expect(result.exposures.length).toBe(1);
    expect(result.log.some((l) => /\[bad\] ERROR/.test(l))).toBe(true);
    expect(result.log.some((l) => /\[ok\]/.test(l))).toBe(true);
  });

  it("dedupes findings against the known footprint", async () => {
    const known = exposure("known", "Whitepages");
    const result = await runDiscovery(
      { ...input, existing: [known] },
      [fakeSource("dup", { exposures: [exposure("new", "Whitepages")] })],
    );
    // the re-found Whitepages email exposure should be filtered as already-known
    expect(result.exposures.length).toBe(0);
  });

  it("ships a default source roster", () => {
    expect(defaultDiscoverySources().length).toBeGreaterThan(3);
  });
});

describe("defaultDiscoverySources entitlement gating", () => {
  const ids = (ent?: Parameters<typeof defaultDiscoverySources>[0]) =>
    new Set(defaultDiscoverySources(ent).map((s) => s.id));

  it("runs the full paid roster when no entitlements (demo / back-compat)", () => {
    const s = ids();
    expect(s.has("autocomplete")).toBe(true);
    expect(s.has("multi_engine_serp")).toBe(true);
    expect(s.has("reverse_image")).toBe(true);
  });

  it("excludes every paid SerpApi connector on the free tier (keyless layers stay)", () => {
    const s = ids(FREE_ENTITLEMENTS);
    expect(s.has("autocomplete")).toBe(false);
    expect(s.has("multi_engine_serp")).toBe(false);
    expect(s.has("reverse_image")).toBe(false);
    expect(s.has("breach_db")).toBe(true); // keyless layer still runs
  });

  it("premium unlocks the reputation + deep-web connectors", () => {
    const s = ids(entitlementsFor({ planId: "premium", status: "active" }));
    expect(s.has("autocomplete")).toBe(true);      // reputation
    expect(s.has("multi_engine_serp")).toBe(true); // deep_web
    expect(s.has("reverse_image")).toBe(true);     // deep_web
  });

  it("a reputation plan gets autocomplete but not the deep-web sweeps", () => {
    const s = ids(entitlementsFor({ planId: "rep-professional", status: "active" }));
    expect(s.has("autocomplete")).toBe(true);
    expect(s.has("multi_engine_serp")).toBe(false);
    expect(s.has("reverse_image")).toBe(false);
  });
});
