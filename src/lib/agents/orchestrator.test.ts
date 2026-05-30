import { describe, expect, it } from "vitest";
import { protect } from "./orchestrator";
import { MockProvider } from "./llm/provider";
import type { Exposure, Subject, Threat } from "@/lib/types";

const subject: Subject = {
  id: "s1",
  type: "executive",
  displayName: "Jordan Vance",
  emails: ["jordan@example.com"],
  phones: ["+15555550100"],
  usernames: ["jvance"],
  organization: "Vance Capital",
  createdAt: new Date().toISOString(),
};

const exposures: Exposure[] = [
  {
    id: "e1",
    subjectId: "s1",
    category: "credential",
    source: "dark_web",
    sourceName: "BreachForum",
    snippet: "jordan@example.com:hunter2",
    riskLevel: "critical",
    riskScore: 60,
    status: "discovered",
    discoveredAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
  },
  {
    id: "e2",
    subjectId: "s1",
    category: "address",
    source: "data_broker",
    sourceName: "Spokeo",
    snippet: "123 Main St",
    riskLevel: "high",
    riskScore: 38,
    status: "discovered",
    discoveredAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
  },
];

const threats: Threat[] = [
  {
    id: "t1",
    subjectId: "s1",
    kind: "doxxing",
    title: "Home address posted on forum",
    detail: "Address + family names posted",
    riskLevel: "critical",
    source: "forum",
    detectedAt: new Date().toISOString(),
    acknowledged: false,
  },
];

describe("orchestrator", () => {
  it("runs all agents and returns prioritized recommendations", async () => {
    const out = await protect({ subject, exposures, threats, provider: new MockProvider() });
    expect(out.agentStates).toHaveLength(8);
    expect(out.recommendations.length).toBeGreaterThan(0);
    // highest-impact recommendation first
    for (let i = 1; i < out.recommendations.length; i++) {
      expect(out.recommendations[i - 1].impact).toBeGreaterThanOrEqual(
        out.recommendations[i].impact,
      );
    }
  });

  it("projects a lower risk after applying recommendations", async () => {
    const out = await protect({ subject, exposures, threats, provider: new MockProvider() });
    expect(out.projectedRisk).toBeLessThanOrEqual(out.riskBefore);
  });

  it("activates executive protection for VIP subjects", async () => {
    const out = await protect({ subject, exposures, threats, provider: new MockProvider() });
    const exec = out.agentStates.find((a) => a.kind === "executive");
    expect(exec?.itemsHandled).toBeGreaterThan(0);
  });

  it("isolates agent failures", async () => {
    const out = await protect({
      subject,
      exposures,
      threats,
      only: ["security"],
      provider: new MockProvider(),
    });
    expect(out.agentStates).toHaveLength(1);
    expect(out.agentStates[0].status).not.toBe("error");
  });
});
