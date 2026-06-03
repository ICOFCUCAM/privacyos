import { describe, it, expect, vi } from "vitest";
import { executiveRiskIndices, riskRecommendations, bandFor, type RiskInput } from "./risk-indices";
import { residenceReport } from "./residence";
import { mapPropertyResponse, resolveResidenceSource, PropertyApiSource, NoResidenceSource } from "./residence-connector";
import { doxxingReport, takedownPlan, summarizeTakedowns } from "./doxxing";
import { buildThreatActors, summarizeActors, actorCasesToOpen, openExecutiveCases } from "./threat-actors";
import type { Case } from "@/lib/types";
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

  it("raises the digital index when credential leaks are supplied", () => {
    const base = { exposures: [], threats: [], family: [], travel: [] };
    const without = executiveRiskIndices(base);
    const withLeaks = executiveRiskIndices({ ...base, credentialLeaks: [
      { id: "l1", account: "a@x.com", breachName: "B", dataClasses: ["Passwords"], pwnCount: 1000, riskLevel: "critical" },
      { id: "l2", account: "b@x.com", breachName: "B", dataClasses: ["Passwords"], pwnCount: 1000, riskLevel: "high" },
    ] });
    expect(withLeaks.digital).toBeGreaterThan(without.digital);
  });

  it("recommends a top action per elevated index, worst-first, none when low", () => {
    const input: RiskInput = {
      exposures: [exposure({ category: "address", riskLevel: "critical" }), exposure({ category: "address", riskLevel: "critical" })],
      threats: [threat({ kind: "doxxing", riskLevel: "critical" })],
      family: [], travel: [],
    };
    const indices = executiveRiskIndices(input);
    const recs = riskRecommendations(input, indices);
    expect(recs.length).toBeGreaterThan(0);
    // physical is the dominant driver here → ranked first
    expect(recs[0].index).toBe("physical");
    expect(recs[0].action).toMatch(/address\/location exposure/);
    // every surfaced rec targets a non-low index, sorted descending
    expect(recs.every((r) => r.value >= 25)).toBe(true);
    expect([...recs].sort((a, b) => b.value - a.value)).toEqual(recs);
    // a clean principal gets no recommendations
    const clean = { exposures: [], threats: [], family: [], travel: [] };
    expect(riskRecommendations(clean, executiveRiskIndices(clean))).toHaveLength(0);
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
    expect(r.live).toBe(false);
  });

  it("uses live property signals authoritatively when provided", () => {
    const r = residenceReport(
      [exposure({ category: "address", riskLevel: "low" })], // would infer 'monitoring'
      { propertyRecordFound: true, listingActive: true, satelliteVisible: true, sources: ["ATTOM"], parcelId: "123-45" },
    );
    expect(r.live).toBe(true);
    const byCheck = Object.fromEntries(r.findings.map((f) => [f.check, f]));
    expect(byCheck.property_records.status).toBe("exposed");
    expect(byCheck.property_records.sources).toContain("ATTOM");
    expect(byCheck.satellite_view.status).toBe("exposed");
    expect(byCheck.home_listing.status).toBe("exposed");
  });
});

describe("residence connector", () => {
  it("maps an ATTOM property response into signals", () => {
    const s = mapPropertyResponse({ property: [{ identifier: { apn: "A-1" }, location: { latitude: "40.7", longitude: "-74.0" }, owner: { owner1: { firstname: "Jane", lastname: "Doe" } }, status: "active" }] });
    expect(s).toMatchObject({ propertyRecordFound: true, listingActive: true, satelliteVisible: true, parcelId: "A-1", ownerOnRecord: "Jane Doe" });
  });

  it("returns null for an empty property list", () => {
    expect(mapPropertyResponse({ property: [] })).toBeNull();
  });

  it("resolves No/Property source by key and degrades gracefully on error", async () => {
    expect(resolveResidenceSource({})).toBeInstanceOf(NoResidenceSource);
    expect(resolveResidenceSource({ PROPERTY_DATA_API_KEY: "k" })).toBeInstanceOf(PropertyApiSource);

    const ok = new PropertyApiSource("k", (async () => ({ ok: true, status: 200, json: async () => ({ property: [{ location: { latitude: 1, longitude: 2 } }] }) })) as unknown as typeof fetch);
    expect((await ok.lookup("1 Main St")).live).toBe(true);

    const bad = new PropertyApiSource("k", (async () => { throw new Error("net"); }) as unknown as typeof fetch);
    expect((await bad.lookup("1 Main St")).live).toBe(false);

    const noFetch = vi.fn();
    expect((await new PropertyApiSource(undefined, noFetch as unknown as typeof fetch).lookup("1 Main St")).live).toBe(false);
    expect(noFetch).not.toHaveBeenCalled();
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

  it("routes each leak to the right takedown channel, critical first", () => {
    const r = doxxingReport({
      exposures: [
        exposure({ category: "address", source: "data_broker", sourceName: "Spokeo", riskLevel: "high" }),
        exposure({ category: "address", source: "social_media", sourceName: "Reddit thread", riskLevel: "critical" }),
        exposure({ category: "employer", source: "data_broker", sourceName: "ZoomInfo", riskLevel: "low" }),
      ],
      threats: [], family: [], employees: [],
    });
    const plan = takedownPlan(r);
    expect(plan).toHaveLength(3);
    expect(plan[0].priority).toBe("critical"); // sorted worst-first
    const broker = plan.find((a) => a.target === "Spokeo")!;
    expect(broker.method).toBe("broker_optout");
    const social = plan.find((a) => a.target === "Reddit thread")!;
    expect(social.method).toBe("platform_report");
    const employer = plan.find((a) => a.target === "ZoomInfo")!;
    expect(employer.method).toBe("employer_notice");

    const sum = summarizeTakedowns(plan);
    expect(sum.total).toBe(3);
    expect(sum.critical).toBe(1);
    expect(sum.byMethod.broker_optout).toBe(1);
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

  it("opens protective cases for active/harassment actors, deduped", () => {
    const actors = buildThreatActors([
      threat({ source: "dark_web", kind: "doxxing", detectedAt: daysAgo(1) }),
      threat({ source: "dark_web", kind: "dark_web_mention", detectedAt: daysAgo(2) }),
      threat({ source: "dark_web", kind: "credential_leak", detectedAt: daysAgo(3) }),
      threat({ source: "news", kind: "negative_press", detectedAt: daysAgo(70) }), // dormant → no case
    ], NOW);
    const cases = actorCasesToOpen(actors);
    expect(cases).toHaveLength(1);
    expect(cases[0]).toMatchObject({ type: "executive_protection", assignedAgent: "executive" });
    expect(cases[0].title).toMatch(/Dark-web actor/);
    // dedup against an already-open case of the same title
    expect(actorCasesToOpen(actors, [cases[0].title])).toHaveLength(0);
  });

  it("openExecutiveCases filters to open executive_protection cases, worst first", () => {
    const c = (over: Partial<Case>): Case => ({
      id: Math.random().toString(36).slice(2), subjectId: "s", type: "executive_protection", title: "T",
      summary: "", status: "open", riskLevel: "high", assignedAgent: "executive", relatedExposureIds: [],
      createdAt: daysAgo(2), updatedAt: daysAgo(1), ...over,
    });
    const out = openExecutiveCases([
      c({ id: "a", riskLevel: "high" }),
      c({ id: "b", riskLevel: "critical" }),
      c({ id: "r", status: "resolved" }),
      c({ id: "o", type: "breach_response" }),
    ]);
    expect(out.map((x) => x.id)).toEqual(["b", "a"]);
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
