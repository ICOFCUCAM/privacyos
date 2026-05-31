import { describe, it, expect } from "vitest";
import { buildCorrelationGraph, correlationStats } from "./correlation";
import type { Exposure, Threat } from "@/lib/types";

const exposure = (over: Partial<Exposure>): Exposure => ({
  id: Math.random().toString(36).slice(2),
  subjectId: "s1",
  category: "name",
  source: "data_broker",
  sourceName: "Test",
  snippet: "",
  riskLevel: "medium",
  riskScore: 20,
  status: "discovered",
  discoveredAt: new Date().toISOString(),
  lastSeenAt: new Date().toISOString(),
  ...over,
});

describe("buildCorrelationGraph", () => {
  it("creates a subject hub plus source and category nodes", () => {
    const g = buildCorrelationGraph("Jordan Vance", [
      exposure({ source: "data_broker", category: "address", riskLevel: "high" }),
      exposure({ source: "dark_web", category: "credential", riskLevel: "critical" }),
    ]);
    const subject = g.nodes.find((n) => n.kind === "subject")!;
    expect(subject.label).toBe("Jordan Vance");
    expect(subject.weight).toBe(2);
    expect(subject.level).toBe("critical"); // inherits the worst attached level
    expect(g.nodes.filter((n) => n.kind === "source")).toHaveLength(2);
    expect(g.nodes.filter((n) => n.kind === "category")).toHaveLength(2);
    // every non-subject node has an edge from the subject
    expect(g.edges).toHaveLength(4);
    expect(g.edges.every((e) => e.from === "subject")).toBe(true);
  });

  it("aggregates weight and dominant severity per source", () => {
    const g = buildCorrelationGraph("X", [
      exposure({ source: "data_broker", riskLevel: "low" }),
      exposure({ source: "data_broker", riskLevel: "high" }),
    ]);
    const broker = g.nodes.find((n) => n.id === "src:data_broker")!;
    expect(broker.weight).toBe(2);
    expect(broker.level).toBe("high");
  });

  it("attaches threats to their source node", () => {
    const threat: Threat = {
      id: "t1", subjectId: "s1", kind: "credential_leak", title: "Leak", detail: "",
      riskLevel: "critical", source: "dark_web", detectedAt: new Date().toISOString(), acknowledged: false,
    };
    const g = buildCorrelationGraph("X", [exposure({ source: "dark_web", riskLevel: "low" })], [threat]);
    const darkWeb = g.nodes.find((n) => n.id === "src:dark_web")!;
    expect(darkWeb.weight).toBe(2); // 1 exposure + 1 threat
    expect(darkWeb.level).toBe("critical");
  });

  it("handles an empty footprint", () => {
    const g = buildCorrelationGraph("X", []);
    expect(g.nodes).toHaveLength(1);
    expect(g.edges).toHaveLength(0);
    expect(g.nodes[0].level).toBe("low");
  });
});

describe("correlationStats", () => {
  it("surfaces top source, top category and critical link count", () => {
    const g = buildCorrelationGraph("X", [
      exposure({ source: "data_broker", category: "address", riskLevel: "high" }),
      exposure({ source: "data_broker", category: "phone", riskLevel: "medium" }),
      exposure({ source: "news", category: "address", riskLevel: "low" }),
    ]);
    const s = correlationStats(g);
    expect(s.sources).toBe(2);
    expect(s.categories).toBe(2);
    expect(s.topSource?.id).toBe("src:data_broker");
    expect(s.topCategory?.id).toBe("cat:address");
    expect(s.criticalLinks).toBeGreaterThanOrEqual(1);
  });
});
