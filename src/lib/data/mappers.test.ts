import { describe, expect, it } from "vitest";
import { aggregateAgentStates, AGENT_CATALOG, mapExposure, mapThreat } from "./mappers";

describe("mappers", () => {
  it("maps a snake_case exposure row to the domain model", () => {
    const e = mapExposure({
      id: "e1",
      subject_id: "s1",
      category: "credential",
      source: "dark_web",
      source_name: "BreachForum",
      url: null,
      snippet: "leak",
      risk_level: "critical",
      risk_score: 60,
      status: "discovered",
      discovered_at: "2026-01-01T00:00:00Z",
      last_seen_at: "2026-01-02T00:00:00Z",
    });
    expect(e.subjectId).toBe("s1");
    expect(e.sourceName).toBe("BreachForum");
    expect(e.url).toBeUndefined();
    expect(e.riskScore).toBe(60);
  });

  it("defaults acknowledged to false when absent", () => {
    const t = mapThreat({
      id: "t1",
      subject_id: "s1",
      kind: "doxxing",
      title: "x",
      risk_level: "high",
      source: "forum",
      detected_at: "2026-01-01T00:00:00Z",
    });
    expect(t.acknowledged).toBe(false);
    expect(t.detail).toBe("");
  });

  it("aggregates agent runs into the full fleet of agent cards", () => {
    const states = aggregateAgentStates([
      { agent: "security", items_handled: 3, ran_at: "2026-01-01T00:00:00Z" },
      { agent: "security", items_handled: 2, ran_at: "2026-01-02T00:00:00Z" },
      { agent: "privacy", items_handled: 5, ran_at: "2026-01-01T00:00:00Z" },
    ]);
    expect(states).toHaveLength(AGENT_CATALOG.length);
    const security = states.find((s) => s.kind === "security")!;
    expect(security.itemsHandled).toBe(5);
    expect(security.lastRunAt).toBe("2026-01-02T00:00:00Z");
    const deepfake = states.find((s) => s.kind === "deepfake")!;
    expect(deepfake.itemsHandled).toBe(0);
  });
});
