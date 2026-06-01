import { describe, it, expect } from "vitest";
import { executiveRiskIndices, bandFor, type RiskInput } from "./risk-indices";
import { residenceReport } from "./residence";
import { doxxingReport } from "./doxxing";
import { buildThreatActors, summarizeActors } from "./threat-actors";
import { exposureHeatMap, threatTimeline, exposureGraph } from "./command";
import type { Exposure, Threat } from "@/lib/types";
import type { EmployeeExposure, FamilyMember, TravelAlert } from "@/lib/suite-types";

const NOW = new Date("2026-05-31T00:00:00Z").getTime();
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();

const exposure = (over: Partial<Exposure>): Exposure => ({
  id: Math.random().toString(36).slice(2), subjectId: "s", category: "address", source: "data_broker",
  sourceName: "Spokeo", snippet: "123 Main St", riskLevel: "high", riskScore: 30, status: "discovered",
  discoveredAt: daysAgo(3), lastSeenAt: daysAgo(1), ...over,
});

const threat = (over: Partial<Threat>): Threat => ({
  id: Math.random().toString(36).slice(2), subjectId: "s", kind: "doxxing", title: "T", detail: "",
  riskLevel: "high", source: "social_media", detectedAt: daysAgo(2), acknowledged: false, ...over,
});

const family = (over: Partial<FamilyMember>): FamilyMember => ({
  id: Math.random().toString(36).slice(2), displayName: "Kid", relation: "Child", isMinor: true, riskLevel: "high", exposuresCount: 2, ...over,
});

const travel = (over: Partial<TravelAlert>): TravelAlert => ({
  id: "t", subjectId: "s", destination: "X", riskLevel: "medium", advisory: "", ...over,
});

describe("risk indices", () => {
  it("all indices are 0–100 and the composite reflects them", () => {
    const input: RiskInput = {
      exposures: [exposure({ category: "address", riskLevel: "critical" }), exposure({ category: "email", riskLevel: "high" })],
      threats: [threat({ kind: "doxxing", riskLevel: "critical" }), threat({ kind: "credential_leak", riskLevel: "high", source: "dark_web" })],
      family: [family({ riskLevel: "critical" })],
      travel: [travel({ riskLevel: "high" })],
    };
    const r = executiveRiskIndices(input);
    for (const v of [r.overall, r.personal, r.family, r.physical, r.digital, r.travel]) {
      expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(100);
    }
    expect(r.physical).toBeGreaterThan(0);
    expect(r.travel).toBeGreaterThan(0);
    expect(r.band).toBe(bandFor(r.overall));
  });

  it("is all-zero / low band with nothing active", () => {
    const r = executiveRiskIndices({ exposures: [], threats: [], family: [], travel: [] });
    expect(r.overall).toBe(0);
    expect(r.band).toBe("low");
  });

  it("ignores acknowledged threats", () => {
    const withAck = executiveRiskIndices({ exposures: [], threats: [threat({ acknowledged: true, riskLevel: "critical" })], family: [], travel: [] });
    expect(withAck.physical).toBe(0);
  });
});

describe("residence", () => {
  it("flags address, property, satellite and listing exposure", () => {
    const r = residenceReport([
      exposure({ category: "address", riskLevel: "high" }),
      exposure({ category: "address", source: "public_record", sourceName: "CountyRecords" }),
      exposure({ category: "address", sourceName: "Zillow" }),
    ]);
    const byCheck = Object.fromEntries(r.findings.map((f) => [f.check, f.status]));
    expect(byCheck.address_exposure).toBe("exposed");
    expect(byCheck.property_records).toBe("exposed"); // public_record present
    expect(byCheck.home_listing).toBe("exposed");     // Zillow
    expect(r.protection).toBeLessThan(100);
  });

  it("is clear with no address exposure", () => {
    const r = residenceReport([exposure({ category: "email" })]);
    expect(r.findings.every((f) => f.status === "clear")).toBe(true);
    expect(r.protection).toBe(100);
  });
});

describe("doxxing", () => {
  it("buckets leaks into address/phone/family/employer", () => {
    const r = doxxingReport({
      exposures: [exposure({ category: "address" }), exposure({ category: "phone" }), exposure({ category: "employer" })],
      threats: [threat({ kind: "doxxing" })],
      family: [family({ exposuresCount: 3 })],
      employees: [{ id: "e", employeeEmail: "x@co.com", exposureType: "Credential leak", riskLevel: "high", source: "dark_web", detectedAt: daysAgo(1) } as EmployeeExposure],
    });
    expect(r.byKind.address).toBe(2); // address exposure + doxxing threat
    expect(r.byKind.phone).toBe(1);
    expect(r.byKind.family).toBe(1);
    expect(r.byKind.employer).toBe(2); // employer exposure + employee record
    expect(r.total).toBe(6);
  });
});

describe("threat actors", () => {
  it("clusters by source, escalates and flags harassment", () => {
    const actors = buildThreatActors([
      threat({ source: "dark_web", kind: "dark_web_mention", detectedAt: daysAgo(1) }),
      threat({ source: "dark_web", kind: "doxxing", detectedAt: daysAgo(3) }),
      threat({ source: "dark_web", kind: "credential_leak", detectedAt: daysAgo(5) }),
      threat({ source: "news", kind: "negative_press", detectedAt: daysAgo(40) }),
    ], NOW);
    const dw = actors.find((a) => a.source === "dark_web")!;
    expect(dw.threatCount).toBe(3);
    expect(dw.escalation).toBe("active"); // 3 threats, recent
    expect(dw.harassment).toBe(true);
    const news = actors.find((a) => a.source === "news")!;
    expect(news.harassment).toBe(false);
    // most-escalated actor sorts first
    expect(actors[0].source).toBe("dark_web");
    const s = summarizeActors(actors);
    expect(s.actors).toBe(2);
    expect(s.harassmentCampaigns).toBe(1);
  });
});

describe("command dashboard", () => {
  const exps = [
    exposure({ category: "address", riskLevel: "critical" }),
    exposure({ category: "address", riskLevel: "low" }),
    exposure({ category: "email", riskLevel: "medium" }),
  ];
  it("heat map groups by category with severity counts, weighted-worst first", () => {
    const heat = exposureHeatMap(exps);
    expect(heat[0].category).toBe("address"); // heaviest
    expect(heat[0].counts.critical).toBe(1);
    expect(heat[0].total).toBe(2);
  });
  it("exposure graph counts per category, most first", () => {
    const g = exposureGraph(exps);
    expect(g[0]).toMatchObject({ category: "address", count: 2, highest: "critical" });
  });
  it("timeline is newest-first", () => {
    const tl = threatTimeline([threat({ detectedAt: daysAgo(10), title: "old" }), threat({ detectedAt: daysAgo(1), title: "new" })]);
    expect(tl[0].title).toBe("new");
  });
});
