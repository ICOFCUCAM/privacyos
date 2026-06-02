import { describe, it, expect } from "vitest";
import { runDiscovery, defaultDiscoverySources } from "./pipeline";
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
