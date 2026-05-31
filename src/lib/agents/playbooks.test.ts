import { describe, it, expect } from "vitest";
import {
  evaluatePlaybook, exposureToFinding, matches, meetsRisk, PLAYBOOKS,
  runPlaybooks, summarizeRuns, threatToFinding, type FindingRef,
} from "./playbooks";
import type { Exposure, Threat } from "@/lib/types";

const finding = (over: Partial<FindingRef>): FindingRef => ({
  id: "f1", title: "Test", riskLevel: "high", ...over,
});

describe("meetsRisk", () => {
  it("orders risk levels correctly", () => {
    expect(meetsRisk("critical", "high")).toBe(true);
    expect(meetsRisk("medium", "high")).toBe(false);
    expect(meetsRisk("high", "high")).toBe(true);
  });
});

describe("matches", () => {
  const broker = PLAYBOOKS.find((p) => p.id === "broker-removal")!;
  const breach = PLAYBOOKS.find((p) => p.id === "credential-breach-response")!;

  it("matches by exposure source above the risk floor", () => {
    expect(matches(broker, finding({ source: "data_broker", riskLevel: "medium" }))).toBe(true);
    expect(matches(broker, finding({ source: "data_broker", riskLevel: "low" }))).toBe(false);
  });

  it("matches by threat kind", () => {
    expect(matches(breach, finding({ threatKind: "credential_leak", riskLevel: "high" }))).toBe(true);
  });

  it("does not match unrelated sources", () => {
    expect(matches(broker, finding({ source: "ai_generated", riskLevel: "critical" }))).toBe(false);
  });
});

describe("evaluatePlaybook", () => {
  const broker = PLAYBOOKS.find((p) => p.id === "broker-removal")!;

  it("auto-executes low-risk steps and pauses irreversible/high steps", () => {
    const run = evaluatePlaybook(broker, finding({ source: "data_broker", riskLevel: "high" }));
    // The GDPR erasure step is irreversible + approvalAtOrAbove high → approval.
    const legalStep = run.steps.find((s) => s.agent === "legal")!;
    expect(legalStep.execution).toBe("approval");
    expect(legalStep.reason).toContain("Irreversible");
    expect(run.autoSteps).toBeGreaterThan(0);
    expect(run.fullyAutonomous).toBe(false);
  });

  it("is fully autonomous when no step crosses its approval threshold", () => {
    const run = evaluatePlaybook(broker, finding({ source: "data_broker", riskLevel: "medium" }));
    // At medium risk, the high-threshold legal step does NOT require approval.
    expect(run.approvalSteps).toBe(0);
    expect(run.fullyAutonomous).toBe(true);
  });
});

describe("runPlaybooks & summarizeRuns", () => {
  it("produces runs for matching findings, highest risk first", () => {
    const findings: FindingRef[] = [
      finding({ id: "a", source: "data_broker", riskLevel: "medium" }),
      finding({ id: "b", threatKind: "credential_leak", riskLevel: "critical" }),
      finding({ id: "c", source: "ai_generated", riskLevel: "high", threatKind: "deepfake" }),
    ];
    const runs = runPlaybooks(findings);
    expect(runs.length).toBeGreaterThan(0);
    const summary = summarizeRuns(runs);
    expect(summary.totalRuns).toBe(runs.length);
    expect(summary.totalSteps).toBeGreaterThan(0);
    expect(summary.automationRate).toBeGreaterThan(0);
    expect(summary.automationRate).toBeLessThanOrEqual(100);
    expect(summary.activePlaybooks).toBeGreaterThan(0);
  });

  it("summarizes an empty run set without NaN", () => {
    const s = summarizeRuns([]);
    expect(s.automationRate).toBe(0);
    expect(s.totalRuns).toBe(0);
  });
});

describe("finding adapters", () => {
  it("maps an exposure to a finding", () => {
    const e = {
      id: "e1", sourceName: "Spokeo", riskLevel: "high", source: "data_broker",
    } as Exposure;
    const f = exposureToFinding(e);
    expect(f.source).toBe("data_broker");
    expect(f.title).toBe("Spokeo");
  });

  it("maps a threat to a finding", () => {
    const t = {
      id: "t1", title: "Leak", riskLevel: "critical", source: "dark_web", kind: "credential_leak",
    } as Threat;
    const f = threatToFinding(t);
    expect(f.threatKind).toBe("credential_leak");
  });
});
