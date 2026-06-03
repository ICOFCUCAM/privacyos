import { describe, it, expect } from "vitest";
import { OrchestratorAgent } from "./orchestrator-agent";
import { IncidentAgent } from "./incident-agent";
import { ComplianceAgent } from "./compliance-agent";
import { ThreatIntelAgent } from "./threat-intel-agent";
import { VendorAgent } from "./vendor-agent";
import { allAgents, AGENT_COUNT } from "./orchestrator";
import { MockProvider } from "./llm/provider";
import type { AgentContext } from "./base-agent";
import type { Exposure, Subject, Threat } from "@/lib/types";

const subject: Subject = {
  id: "s1", type: "business", displayName: "Vance Capital",
  emails: ["ops@vancecapital.com"], phones: [], usernames: [], organization: "Vance Capital",
  createdAt: "2025-01-01T00:00:00Z",
};

const exposures: Exposure[] = [
  { id: "e1", subjectId: "s1", category: "credential", source: "dark_web", sourceName: "BreachForums", snippet: "", riskLevel: "critical", riskScore: 60, status: "discovered", discoveredAt: "2026-05-30T00:00:00Z", lastSeenAt: "2026-05-31T00:00:00Z" },
  { id: "e2", subjectId: "s1", category: "address", source: "data_broker", sourceName: "Spokeo", snippet: "", riskLevel: "high", riskScore: 38, status: "discovered", discoveredAt: "2026-05-20T00:00:00Z", lastSeenAt: "2026-05-31T00:00:00Z" },
];
const threats: Threat[] = [
  { id: "t1", subjectId: "s1", kind: "impersonation", title: "Fake domain", detail: "", riskLevel: "high", source: "forum", detectedAt: "2026-05-29T00:00:00Z", acknowledged: false },
];

const ctx: AgentContext = { subject, exposures, threats, llm: new MockProvider(), now: Date.parse("2026-05-31T12:00:00Z") };

describe("fleet registration", () => {
  it("registers all 13 agents and exposes a stable count", () => {
    expect(AGENT_COUNT).toBe(13);
    expect(allAgents()).toHaveLength(13);
    const kinds = allAgents().map((a) => a.kind);
    for (const k of ["orchestrator", "incident", "compliance", "threat_intel", "vendor"]) {
      expect(kinds).toContain(k);
    }
  });
});

describe("OrchestratorAgent", () => {
  it("triages the queue and routes priority work", async () => {
    const r = await new OrchestratorAgent().run(ctx);
    expect(r.agent).toBe("orchestrator");
    expect(r.recommendations.length).toBeGreaterThan(0);
    expect(r.recommendations[0].riskLevel).toBe("critical"); // has a critical exposure
    expect(r.log[0]).toMatch(/routed/i);
  });
});

describe("IncidentAgent", () => {
  it("runs playbooks and reports automation/approval counts", async () => {
    const r = await new IncidentAgent().run(ctx);
    expect(r.agent).toBe("incident");
    expect(r.log[0]).toMatch(/Playbooks:/);
  });
});

describe("ComplianceAgent", () => {
  it("reports SOC 2 posture and flags open controls", async () => {
    const r = await new ComplianceAgent().run(ctx);
    expect(r.agent).toBe("compliance");
    expect(r.log[0]).toMatch(/SOC 2 readiness/i);
  });
});

describe("ThreatIntelAgent", () => {
  it("correlates signals into a top-vector narrative", async () => {
    const r = await new ThreatIntelAgent().run(ctx);
    expect(r.agent).toBe("threat_intel");
    expect(r.log[0]).toMatch(/Correlation:/);
    expect(r.recommendations.length).toBeGreaterThan(0); // high-risk links present
  });
});

describe("VendorAgent", () => {
  it("assesses supply-chain risk for organizations", async () => {
    const r = await new VendorAgent().run(ctx);
    expect(r.agent).toBe("vendor");
    expect(r.recommendations.length).toBeGreaterThan(0); // impersonation threat present
  });

  it("idles for non-business subjects", async () => {
    const personal = { ...subject, type: "individual" as const };
    const r = await new VendorAgent().run({ ...ctx, subject: personal });
    expect(r.recommendations).toHaveLength(0);
    expect(r.log[0]).toMatch(/not an organization/i);
  });
});
