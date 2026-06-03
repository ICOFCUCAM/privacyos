import { describe, it, expect } from "vitest";
import { caseFromThreat, casesForNewThreats, shouldOpenCaseForThreat, type ThreatLike } from "./threat-cases";

const threat = (over: Partial<ThreatLike>): ThreatLike => ({
  subjectId: "s1", kind: "credential_leak", title: "Leak", detail: "creds leaked", riskLevel: "critical", ...over,
});

describe("shouldOpenCaseForThreat", () => {
  it("only opens for high/critical", () => {
    expect(shouldOpenCaseForThreat({ riskLevel: "critical" })).toBe(true);
    expect(shouldOpenCaseForThreat({ riskLevel: "high" })).toBe(true);
    expect(shouldOpenCaseForThreat({ riskLevel: "medium" })).toBe(false);
    expect(shouldOpenCaseForThreat({ riskLevel: "low" })).toBe(false);
  });
});

describe("caseFromThreat", () => {
  it("routes each kind to the right type + agent", () => {
    expect(caseFromThreat(threat({ kind: "credential_leak" }))).toMatchObject({ type: "breach_response", assignedAgent: "security" });
    expect(caseFromThreat(threat({ kind: "deepfake" }))).toMatchObject({ type: "deepfake_incident", assignedAgent: "deepfake" });
    expect(caseFromThreat(threat({ kind: "impersonation" }))).toMatchObject({ type: "impersonation_takedown" });
    expect(caseFromThreat(threat({ kind: "negative_press" }))).toMatchObject({ type: "reputation_recovery", assignedAgent: "reputation" });
    expect(caseFromThreat(threat({ kind: "location_exposure" }))).toMatchObject({ type: "data_broker_removal", assignedAgent: "privacy" });
  });

  it("carries the threat's title, detail and risk", () => {
    const c = caseFromThreat(threat({ title: "Dark web hit", detail: "found", riskLevel: "high" }));
    expect(c.title).toBe("Dark web hit");
    expect(c.summary).toBe("found");
    expect(c.riskLevel).toBe("high");
  });
});

describe("casesForNewThreats", () => {
  it("opens cases for high/critical, skipping low/medium", () => {
    const cases = casesForNewThreats([
      threat({ title: "A", riskLevel: "critical" }),
      threat({ title: "B", riskLevel: "medium" }),
      threat({ title: "C", riskLevel: "high" }),
    ]);
    expect(cases.map((c) => c.title)).toEqual(["A", "C"]);
  });

  it("dedupes against existing open case titles and within the batch", () => {
    const cases = casesForNewThreats(
      [threat({ title: "A" }), threat({ title: "A" }), threat({ title: "D" })],
      ["A"],
    );
    expect(cases.map((c) => c.title)).toEqual(["D"]);
  });
});
