import { describe, it, expect, vi } from "vitest";
import { CachedSource, isCacheFresh, DISCOVERY_TTL_MS } from "./connector-cache";
import type { DiscoverySource, DiscoveryInput, DiscoveryFinding } from "./source";
import type { Subject } from "@/lib/types";

const subject: Subject = {
  id: "s1", type: "individual", displayName: "Jordan", emails: [], phones: [], usernames: [], createdAt: "",
};
const input: DiscoveryInput = { subject, existing: [] };

describe("isCacheFresh", () => {
  it("respects the TTL", () => {
    const now = Date.now();
    expect(isCacheFresh(new Date(now - 1000).toISOString(), now)).toBe(true);
    expect(isCacheFresh(new Date(now - DISCOVERY_TTL_MS - 1000).toISOString(), now)).toBe(false);
    expect(isCacheFresh("not-a-date", now)).toBe(false);
  });
});

describe("CachedSource", () => {
  it("delegates id and name to the wrapped source", () => {
    const inner: DiscoverySource = { id: "x", name: "X Connector", scan: async () => ({ exposures: [], threats: [], log: [] }) };
    const c = new CachedSource(inner);
    expect(c.id).toBe("x");
    expect(c.name).toBe("X Connector");
  });

  it("passes through to the source when there is no cache session (demo/anon)", async () => {
    // No Supabase env in tests → getCacheSession() returns null → pass-through.
    const scan = vi.fn(async (): Promise<DiscoveryFinding> => ({ exposures: [], threats: [], log: ["live"] }));
    const inner: DiscoverySource = { id: "x", name: "X", scan };
    const f = await new CachedSource(inner).scan(input);
    expect(scan).toHaveBeenCalledTimes(1);
    expect(f.log).toContain("live");
  });
});
