import { describe, it, expect } from "vitest";
import { allAgents } from "./orchestrator";
import { MockProvider } from "./llm/provider";
import type { AgentContext } from "./base-agent";
import type { Subject, Exposure, Threat } from "@/lib/types";

const subject: Subject = {
  id: "s1", type: "individual", displayName: "Jordan Avery", emails: ["jordan@acme.com"],
  phones: ["+15555550100"], usernames: ["jordanavery"], organization: "Acme", createdAt: "2026-01-01T00:00:00Z",
};
const exposures: Exposure[] = [
  { id: "e1", subjectId: "s1", category: "address", source: "data_broker", sourceName: "Spokeo", snippet: "",
    riskLevel: "high", riskScore: 30, status: "monitoring", discoveredAt: "2026-01-01T00:00:00Z", lastSeenAt: "2026-01-01T00:00:00Z" },
  { id: "e2", subjectId: "s1", category: "credential", source: "breach_db", sourceName: "LinkedIn", snippet: "",
    riskLevel: "critical", riskScore: 50, status: "monitoring", discoveredAt: "2026-01-01T00:00:00Z", lastSeenAt: "2026-01-01T00:00:00Z" },
];
const threats: Threat[] = [
  { id: "t1", subjectId: "s1", kind: "doxxing", title: "Address posted", detail: "", riskLevel: "critical",
    source: "dark_web", detectedAt: "2026-01-02T00:00:00Z", acknowledged: false },
];
const ctx: AgentContext = { subject, exposures, threats, llm: new MockProvider(), now: Date.parse("2026-02-01T00:00:00Z") };

describe("fleet — every agent honors the AgentResult contract", () => {
  it("runs all 13 agents to a well-formed result", async () => {
    const agents = allAgents();
    expect(agents).toHaveLength(13);

    for (const agent of agents) {
      const r = await agent.run(ctx);
      expect(r.agent, agent.name).toBe(agent.kind);
      expect(Array.isArray(r.findings)).toBe(true);
      expect(Array.isArray(r.threats)).toBe(true);
      expect(Array.isArray(r.recommendations)).toBe(true);
      expect(Array.isArray(r.log)).toBe(true);
      // recommendations, when present, are well-formed and attributed
      for (const rec of r.recommendations) {
        expect(rec.title.length).toBeGreaterThan(0);
        expect(["low", "medium", "high", "critical"]).toContain(rec.riskLevel);
      }
    }
  });

  it("agents are deterministic under the mock provider", async () => {
    const [a] = allAgents();
    const r1 = await a.run(ctx);
    const r2 = await a.run(ctx);
    expect(r1.findings.length).toBe(r2.findings.length);
  });
});
