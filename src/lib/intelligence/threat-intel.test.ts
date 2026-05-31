import { describe, it, expect } from "vitest";
import {
  groupThreats, investigationTimeline, summarizeThreats, threatIntel,
} from "./threat-intel";
import type { Threat } from "@/lib/types";

const threat = (over: Partial<Threat>): Threat => ({
  id: Math.random().toString(36).slice(2), subjectId: "s1", kind: "credential_leak",
  title: "Credentials exposed in Dropbox", detail: "", riskLevel: "critical",
  source: "breach_db", detectedAt: "2026-05-30T10:00:00Z", acknowledged: false, ...over,
});

describe("summarizeThreats", () => {
  it("counts active threats by severity and finds latest + highest", () => {
    const s = summarizeThreats([
      threat({ riskLevel: "critical", detectedAt: "2026-05-30T10:00:00Z" }),
      threat({ riskLevel: "high", detectedAt: "2026-05-31T10:00:00Z" }),
      threat({ riskLevel: "medium", acknowledged: true }),
    ]);
    expect(s.active).toBe(2);
    expect(s.total).toBe(3);
    expect(s.bySeverity.critical).toBe(1);
    expect(s.bySeverity.high).toBe(1);
    expect(s.bySeverity.medium).toBe(0); // acknowledged → not active
    expect(s.latest?.detectedAt).toBe("2026-05-31T10:00:00Z");
    expect(s.highest?.riskLevel).toBe("critical");
    expect(s.agentsWorking).toBeGreaterThan(0);
  });

  it("reports zero agents working when nothing is active", () => {
    expect(summarizeThreats([threat({ acknowledged: true })]).agentsWorking).toBe(0);
  });
});

describe("groupThreats", () => {
  it("groups by kind, worst severity first", () => {
    const groups = groupThreats([
      threat({ kind: "negative_press", riskLevel: "low" }),
      threat({ kind: "credential_leak", riskLevel: "critical" }),
      threat({ kind: "credential_leak", riskLevel: "high" }),
    ]);
    expect(groups[0].kind).toBe("credential_leak");
    expect(groups[0].count).toBe(2);
    expect(groups[0].label).toBe("Credential Leak");
    expect(groups[0].topSeverity).toBe("critical");
  });
});

describe("threatIntel", () => {
  it("scores a breach-DB credential leak as verified / high confidence", () => {
    const i = threatIntel(threat({ source: "breach_db", riskLevel: "critical" }));
    expect(i.reliability).toBe("Verified");
    expect(i.confidence).toBe("High");
    expect(i.riskScore).toBeGreaterThan(90);
  });

  it("scores a social-media signal as unverified / low confidence", () => {
    const i = threatIntel(threat({ source: "social_media", riskLevel: "medium" }));
    expect(i.reliability).toBe("Unverified");
    expect(i.confidence).toBe("Low");
    expect(i.riskScore).toBeLessThan(50);
  });
});

describe("investigationTimeline", () => {
  it("always starts with Discovery → Threat Intelligence", () => {
    const steps = investigationTimeline(threat({ riskLevel: "low", kind: "negative_press" }));
    expect(steps[0].agent).toBe("discovery");
    expect(steps[1].agent).toBe("threat_intel");
  });

  it("routes credential leaks through Security, and escalates critical to Incident + Legal", () => {
    const steps = investigationTimeline(threat({ kind: "credential_leak", riskLevel: "critical" }));
    const agents = steps.map((s) => s.agent);
    expect(agents).toContain("security");
    expect(agents).toContain("incident");
    expect(agents).toContain("legal");
  });

  it("routes deepfakes through the Deepfake agent", () => {
    const steps = investigationTimeline(threat({ kind: "deepfake", riskLevel: "high" }));
    expect(steps.map((s) => s.agent)).toContain("deepfake");
  });

  it("appends an analyst step when acknowledged", () => {
    const steps = investigationTimeline(threat({ acknowledged: true, riskLevel: "low", kind: "negative_press" }));
    expect(steps.at(-1)?.agent).toBe("user");
  });
});
