import { describe, it, expect } from "vitest";
import { buildScaryMirror, mirrorSeverity, type ScaryMirrorInput } from "./scary-mirror";
import type { Exposure, Threat, ExposureSource, ThreatKind, RiskLevel } from "@/lib/types";

const exposure = (source: ExposureSource, sourceName: string, riskLevel: RiskLevel = "medium"): Exposure => ({
  id: Math.random().toString(36).slice(2), subjectId: "s1", category: "address", source, sourceName,
  snippet: "", riskLevel, riskScore: 10, status: "monitoring", discoveredAt: "2026-01-01T00:00:00Z", lastSeenAt: "2026-01-01T00:00:00Z",
});

const threat = (kind: ThreatKind, title: string, riskLevel: RiskLevel = "high", acknowledged = false): Threat => ({
  id: Math.random().toString(36).slice(2), subjectId: "s1", kind, title, detail: "", riskLevel,
  source: "dark_web", detectedAt: "2026-01-01T00:00:00Z", acknowledged,
});

const input = (over: Partial<ScaryMirrorInput> = {}): ScaryMirrorInput => ({
  name: "Jordan",
  exposures: [
    exposure("data_broker", "Spokeo", "high"),
    exposure("data_broker", "Whitepages", "medium"),
    exposure("public_record", "CountyRecords", "low"),
    exposure("breach_db", "LinkedIn 2021", "high"),
    exposure("dark_web", "AlphaMarket", "critical"),
    exposure("search_engine", "Old news article", "medium"),
    exposure("social_media", "Fake profile", "high"),
  ],
  threats: [
    threat("credential_leak", "Password found in breach", "critical"),
    threat("doxxing", "Home address posted", "critical"),
    threat("negative_press", "Negative article", "medium"),
    threat("impersonation", "Impersonating account", "high", true), // acknowledged → excluded
  ],
  ...over,
});

describe("The Scary Mirror (activation engine)", () => {
  it("groups real exposures + threats into human categories", () => {
    const r = buildScaryMirror(input());
    const cats = new Set(r.findings.map((f) => f.category));
    expect(cats.has("brokers")).toBe(true);    // data_broker + public_record
    expect(cats.has("breaches")).toBe(true);   // breach_db + credential_leak
    expect(cats.has("darkweb")).toBe(true);    // dark_web
    expect(cats.has("reputation")).toBe(true); // search_engine + negative_press
    expect(cats.has("social")).toBe(true);     // social_media
    expect(cats.has("identity")).toBe(true);   // doxxing

    const brokers = r.findings.find((f) => f.category === "brokers")!;
    expect(brokers.count).toBe(3); // 2 brokers + 1 public record
    expect(brokers.severity).toBe("high"); // max of high/medium/low
    expect(brokers.samples).toContain("Spokeo");
  });

  it("surfaces financial/credential exposure as its own activation category", () => {
    const r = buildScaryMirror({
      name: "Jordan",
      exposures: [
        { ...exposure("data_broker", "BankLeak", "critical"), category: "financial" },
        { ...exposure("breach_db", "CredStore", "high"), category: "credential" },
      ],
      threats: [],
    });
    const fin = r.findings.find((f) => f.category === "financial");
    expect(fin).toBeDefined();
    expect(fin!.count).toBe(2);
    expect(r.fixPlan.some((s) => s.pack === "breach-response")).toBe(true);
  });

  it("excludes acknowledged threats", () => {
    const r = buildScaryMirror(input());
    const social = r.findings.find((f) => f.category === "social")!;
    // only the fake social_media profile counts; the acknowledged impersonation is excluded
    expect(social.count).toBe(1);
  });

  it("produces a scary headline, exposure score and worst finding", () => {
    const r = buildScaryMirror(input());
    expect(r.totalFindings).toBe(10); // 7 exposures + 3 unacked threats
    expect(r.headline).toMatch(/found 10 ways you're exposed/);
    expect(r.exposureScore).toBeGreaterThan(0);
    expect(r.exposureScore).toBeLessThanOrEqual(96);
    expect(r.protectionScore).toBe(100 - r.exposureScore);
    expect(r.worst).not.toBeNull();
    expect(r.worst!.severity).toBe("critical"); // dark-web/breach/doxxing are critical
    expect(mirrorSeverity(r)).toBe("critical");
  });

  it("builds an auto-remediation plan that maps to protection packs", () => {
    const r = buildScaryMirror(input());
    expect(r.fixPlan.length).toBe(r.findings.length);
    const packs = new Set(r.fixPlan.map((s) => s.pack));
    expect(packs.has("remove-data-brokers")).toBe(true);
    expect(packs.has("breach-response")).toBe(true);
    expect(packs.has("dark-web-watch")).toBe(true);
    expect(r.scanLog.length).toBeGreaterThan(3);
    expect(r.scanLog[0]).toMatch(/Jordan/);
  });

  it("handles a clean scan gracefully", () => {
    const r = buildScaryMirror({ name: "Sam", exposures: [], threats: [] });
    expect(r.totalFindings).toBe(0);
    expect(r.exposureScore).toBe(0);
    expect(r.protectionScore).toBe(100);
    expect(r.worst).toBeNull();
    expect(r.headline).toMatch(/found nothing exposed/);
  });
});
