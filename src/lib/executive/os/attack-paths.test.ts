import { describe, it, expect } from "vitest";
import { analyzeAttackSurface, buildSignalIndex, removeSignal, remediationHref, simulateRemovals } from "./attack-paths";
import type { Exposure, Threat } from "@/lib/types";

describe("remediationHref", () => {
  it("routes broker-removable signals to removals and threat/IR signals to the threat feed", () => {
    expect(remediationHref("address")).toBe("/dashboard/removals");
    expect(remediationHref("breach")).toBe("/dashboard/removals");
    expect(remediationHref("credential")).toBe("/dashboard/threats");
    expect(remediationHref("darkweb")).toBe("/dashboard/threats");
    expect(remediationHref("impersonation")).toBe("/dashboard/threats");
  });
});

const exposure = (over: Partial<Exposure>): Exposure => ({
  id: Math.random().toString(36).slice(2), subjectId: "s", category: "address", source: "data_broker",
  sourceName: "Spokeo", snippet: "", riskLevel: "high", riskScore: 30, status: "discovered",
  discoveredAt: "2026-05-01T00:00:00Z", lastSeenAt: "2026-05-01T00:00:00Z", ...over,
});
const threat = (over: Partial<Threat>): Threat => ({
  id: Math.random().toString(36).slice(2), subjectId: "s", kind: "doxxing", title: "T", detail: "",
  riskLevel: "high", source: "social_media", detectedAt: "2026-05-01T00:00:00Z", acknowledged: false, ...over,
});

describe("buildSignalIndex", () => {
  it("maps categories, sources, threats and credential leaks to signals", () => {
    const idx = buildSignalIndex({
      exposures: [exposure({ category: "address" }), exposure({ category: "email", source: "breach_db", sourceName: "Collection#1" })],
      threats: [threat({ kind: "doxxing" }), threat({ kind: "impersonation" })],
      credentialLeaks: [{ id: "l", account: "a", breachName: "Mega", dataClasses: [], pwnCount: 1, riskLevel: "high" }],
    });
    expect(idx.address?.count).toBe(1);
    expect(idx.email?.count).toBe(1);
    expect(idx.breach?.count).toBe(1);
    expect(idx.doxxing?.count).toBe(1);
    expect(idx.impersonation?.count).toBe(1);
    expect(idx.credential?.count).toBe(1);
  });

  it("ignores acknowledged threats", () => {
    const idx = buildSignalIndex({ exposures: [], threats: [threat({ kind: "doxxing", acknowledged: true })] });
    expect(idx.doxxing).toBeUndefined();
  });
});

describe("analyzeAttackSurface", () => {
  it("lights a path once half its chain is present, scores feasibility × impact", () => {
    // swatting needs address+phone+doxxing+family; supply 3/4 → enabled
    const surface = analyzeAttackSurface({
      exposures: [exposure({ category: "address" }), exposure({ category: "phone" }), exposure({ category: "family" })],
      threats: [threat({ kind: "doxxing" })],
    });
    const swat = surface.paths.find((p) => p.id === "swatting")!;
    expect(swat.present).toBe(4);
    expect(swat.enabled).toBe(true);
    expect(swat.score).toBe(95); // 4/4 × 95
    expect(surface.enabledPaths).toBeGreaterThan(0);
    // paths are ranked by score
    expect(surface.paths[0].score).toBeGreaterThanOrEqual(surface.paths[1].score);
  });

  it("computes the chokepoint as the signal breaking the most enabled paths", () => {
    // address is shared by swatting + stalking + idtheft
    const surface = analyzeAttackSurface({
      exposures: [
        exposure({ category: "address" }), exposure({ category: "phone" }),
        exposure({ category: "photo" }), exposure({ category: "financial" }),
        exposure({ category: "email", source: "breach_db" }),
      ],
      threats: [threat({ kind: "doxxing" }), threat({ kind: "location_exposure" })],
    });
    expect(surface.chokepoint).not.toBeNull();
    expect(surface.chokepoint!.signal).toBe("address");
    expect(surface.chokepoint!.breaks).toBeGreaterThanOrEqual(3);
    expect(surface.chokepoint!.action).toMatch(/address/i);
  });

  it("finds no live paths for a clean principal", () => {
    const surface = analyzeAttackSurface({ exposures: [], threats: [] });
    expect(surface.enabledPaths).toBe(0);
    expect(surface.chokepoint).toBeNull();
    expect(surface.paths.every((p) => !p.enabled)).toBe(true);
  });
});

describe("what-if leverage", () => {
  const input = {
    exposures: [
      exposure({ category: "address" }), exposure({ category: "phone" }),
      exposure({ category: "photo" }), exposure({ category: "family" }),
    ],
    threats: [threat({ kind: "doxxing" }), threat({ kind: "location_exposure" })],
  };

  it("removeSignal strips every contributor to a signal", () => {
    const without = removeSignal(input, "address");
    expect(without.exposures.some((e) => e.category === "address")).toBe(false);
    // other categories survive
    expect(without.exposures.some((e) => e.category === "phone")).toBe(true);
    // threat-driven signal removal
    expect(removeSignal(input, "doxxing").threats.some((t) => t.kind === "doxxing")).toBe(false);
  });

  it("ranks signals by the risk their removal removes", () => {
    const lev = simulateRemovals(input);
    // address feeds swatting + stalking → removing it removes the most risk
    expect(lev[0].signal).toBe("address");
    expect(lev[0].scoreDrop).toBeGreaterThan(0);
    // ranked by scoreDrop descending; non-negative remaining-path counts
    expect([...lev].sort((a, b) => b.scoreDrop - a.scoreDrop)).toEqual(lev);
    expect(lev.every((r) => r.pathsAfter >= 0 && r.scoreDrop >= 0)).toBe(true);
  });

  it("matches the chokepoint as the top-leverage signal", () => {
    const surface = analyzeAttackSurface(input);
    const lev = simulateRemovals(input);
    expect(lev[0].signal).toBe(surface.chokepoint!.signal);
  });
});
