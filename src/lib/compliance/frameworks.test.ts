import { describe, it, expect } from "vitest";
import {
  FRAMEWORKS, COMPLIANCE_TASKS, allFrameworkCoverage, frameworkCoverage,
  overallFrameworkCoverage, runComplianceCycle, type Framework,
} from "./frameworks";

describe("FRAMEWORKS catalog", () => {
  it("covers the required frameworks (and more)", () => {
    const ids = FRAMEWORKS.map((f) => f.id);
    for (const required of ["gdpr", "ccpa", "soc2", "iso27001"]) {
      expect(ids).toContain(required);
    }
    // "even more"
    expect(ids).toContain("hipaa");
    expect(ids).toContain("pci_dss");
  });

  it("every framework has requirements with evidence", () => {
    for (const fw of FRAMEWORKS) {
      expect(fw.requirements.length).toBeGreaterThan(0);
      for (const r of fw.requirements) {
        expect(r.evidence.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("frameworkCoverage", () => {
  it("weights met=1, in_progress=0.5, gap=0", () => {
    const fw: Framework = {
      id: "soc2", name: "Test", authority: "x", summary: "y",
      requirements: [
        { id: "a", title: "", evidence: "e", status: "met" },
        { id: "b", title: "", evidence: "e", status: "in_progress" },
        { id: "c", title: "", evidence: "e", status: "gap" },
      ],
    };
    const c = frameworkCoverage(fw);
    expect(c.coverage).toBe(50); // (1 + 0.5 + 0) / 3
    expect(c.met).toBe(1);
    expect(c.inProgress).toBe(1);
    expect(c.gaps).toBe(1);
    expect(c.standing).toBe("At risk");
  });

  it("labels a fully-met framework Compliant", () => {
    const fw = FRAMEWORKS.find((f) => f.id === "ccpa")!;
    const c = frameworkCoverage(fw);
    expect(c.coverage).toBeGreaterThanOrEqual(90);
    expect(c.standing).toBe("Compliant");
  });
});

describe("overall + cycle", () => {
  it("blends coverage across all frameworks", () => {
    const overall = overallFrameworkCoverage();
    expect(overall).toBeGreaterThan(0);
    expect(overall).toBeLessThanOrEqual(100);
    expect(allFrameworkCoverage()).toHaveLength(FRAMEWORKS.length);
  });

  it("runs a monitoring cycle across every framework", () => {
    const cycle = runComplianceCycle();
    expect(cycle.tasksRun).toBe(COMPLIANCE_TASKS.length);
    expect(cycle.frameworksMonitored).toBe(FRAMEWORKS.length);
    expect(cycle.openItems).toBeGreaterThanOrEqual(0);
    expect(cycle.overallCoverage).toBe(overallFrameworkCoverage());
  });

  it("has monitoring tasks for the headline frameworks", () => {
    const fwWithTasks = new Set(COMPLIANCE_TASKS.map((t) => t.framework));
    for (const f of ["gdpr", "ccpa", "soc2", "iso27001"]) {
      expect(fwWithTasks.has(f as never)).toBe(true);
    }
  });
});
