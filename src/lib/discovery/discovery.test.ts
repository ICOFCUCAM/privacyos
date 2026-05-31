import { describe, expect, it } from "vitest";
import {
  BreachConnector,
  breachRiskLevel,
  simulateBreaches,
} from "./breach-connector";
import { runDiscovery } from "./pipeline";
import { dedupeKey, type DiscoverySource } from "./source";
import type { Exposure, Subject } from "@/lib/types";

const subject: Subject = {
  id: "s1",
  type: "individual",
  displayName: "Test User",
  emails: ["alice@example.com", "bob@example.com"],
  phones: [],
  usernames: [],
  createdAt: new Date().toISOString(),
};

describe("breach risk classification", () => {
  it("treats password/financial leaks as critical", () => {
    expect(breachRiskLevel(["Email addresses", "Passwords"])).toBe("critical");
    expect(breachRiskLevel(["Credit cards"])).toBe("critical");
  });
  it("classifies low-sensitivity leaks below critical", () => {
    expect(breachRiskLevel(["Email addresses", "Usernames"])).toBe("medium");
    expect(breachRiskLevel(["Email addresses"])).toBe("low");
  });
});

describe("simulateBreaches", () => {
  it("is deterministic for the same email", () => {
    expect(simulateBreaches("alice@example.com")).toEqual(simulateBreaches("alice@example.com"));
  });
});

describe("BreachConnector", () => {
  it("produces exposures and raises threats for critical breaches", async () => {
    const conn = new BreachConnector(undefined); // no key → simulator
    const finding = await conn.scan({ subject, existing: [] });
    // every threat must correspond to a critical exposure
    for (const t of finding.threats) {
      expect(t.kind).toBe("credential_leak");
      expect(t.riskLevel).toBe("critical");
    }
    expect(finding.log.length).toBeGreaterThan(0);
  });
});

describe("runDiscovery pipeline", () => {
  it("dedupes findings against the existing footprint", async () => {
    const conn = new BreachConnector(undefined);
    const first = await runDiscovery({ subject, existing: [] }, [conn]);
    // Feed the first batch back as "existing" — a re-scan should find nothing new.
    const existing = first.exposures as Exposure[];
    const second = await runDiscovery({ subject, existing }, [conn]);
    expect(second.exposures).toHaveLength(0);
  });

  it("dedupes THREATS against the existing footprint (no re-emit each run)", async () => {
    const conn = new BreachConnector(undefined);
    const first = await runDiscovery({ subject, existing: [] }, [conn]);
    expect(first.threats.length).toBeGreaterThan(0); // breach raises threats
    // Re-scan passing the prior exposures AND threats as existing — nothing new.
    const second = await runDiscovery(
      { subject, existing: first.exposures, existingThreats: first.threats },
      [conn],
    );
    expect(second.threats).toHaveLength(0);
  });

  it("isolates a failing source", async () => {
    const ok = new BreachConnector(undefined);
    const boom: DiscoverySource = {
      id: "boom",
      name: "Exploding source",
      scan: async () => {
        throw new Error("kaboom");
      },
    };
    const finding = await runDiscovery({ subject, existing: [] }, [ok, boom]);
    expect(finding.log.some((l) => l.includes("ERROR"))).toBe(true);
    // The healthy source's findings still come through.
    expect(finding.log.some((l) => l.startsWith("[breach_db]"))).toBe(true);
  });

  it("computes a stable content dedupe key", () => {
    const key = dedupeKey({ source: "breach_db", sourceName: "LinkedIn", snippet: "X" });
    expect(key).toBe("breach_db::linkedin::x");
  });
});
