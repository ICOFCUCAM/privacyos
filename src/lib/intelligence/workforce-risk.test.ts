import { describe, it, expect } from "vitest";
import { buildWorkforce, rotationWorkflow, summarizeWorkforce } from "./workforce-risk";
import type { CredentialLeak, EmployeeExposure } from "@/lib/suite-types";

const exp = (over: Partial<EmployeeExposure>): EmployeeExposure => ({
  id: Math.random().toString(36).slice(2), employeeEmail: "a@co.com", exposureType: "Credential leak",
  riskLevel: "high", source: "dark_web", detectedAt: "2026-05-01T00:00:00Z", ...over,
});

const leak = (over: Partial<CredentialLeak>): CredentialLeak => ({
  id: Math.random().toString(36).slice(2), account: "a@co.com", breachName: "Breach", dataClasses: ["Passwords"],
  pwnCount: 1000, riskLevel: "critical", ...over,
});

describe("buildWorkforce", () => {
  it("joins exposures and leaks per email and ranks highest-risk first", () => {
    const people = buildWorkforce(
      [exp({ employeeEmail: "a@co.com", employeeName: "A", riskLevel: "high" }), exp({ employeeEmail: "b@co.com", riskLevel: "medium" })],
      [leak({ account: "a@co.com", pwnCount: 500, riskLevel: "critical" })],
    );
    expect(people).toHaveLength(2);
    expect(people[0].email).toBe("a@co.com"); // critical via leak
    expect(people[0].highestRisk).toBe("critical");
    expect(people[0].leaks).toHaveLength(1);
    expect(people[0].exposedRecords).toBe(500);
  });

  it("recommends rotation + MFA when a credential leak is present", () => {
    const [p] = buildWorkforce([], [leak({})]);
    expect(p.actions.join(" ")).toMatch(/rotation/i);
    expect(p.actions.join(" ")).toMatch(/MFA/i);
  });

  it("recommends a broker opt-out for broker exposures", () => {
    const [p] = buildWorkforce([exp({ exposureType: "Personal data on broker", riskLevel: "medium" })], []);
    expect(p.actions.some((a) => /broker opt-out/i.test(a))).toBe(true);
  });
});

describe("summarizeWorkforce", () => {
  it("summarizes affected employees, criticals and exposed records", () => {
    const s = summarizeWorkforce(
      [exp({ employeeEmail: "a@co.com", riskLevel: "high" })],
      [leak({ account: "a@co.com", pwnCount: 700 }), leak({ account: "c@co.com", pwnCount: 300, riskLevel: "high" })],
    );
    expect(s.employeesAffected).toBe(2); // a + c
    expect(s.credentialLeaks).toBe(2);
    expect(s.exposedRecords).toBe(1000);
    expect(s.critical).toBe(1); // a is critical via its leak
    expect(s.postureLevel).toBe("critical");
  });

  it("is secure for an unaffected workforce", () => {
    const s = summarizeWorkforce([], []);
    expect(s.posture).toBe(100);
    expect(s.postureLevel).toBe("secure");
  });
});

describe("rotationWorkflow", () => {
  it("is a 5-step playbook", () => {
    expect(rotationWorkflow()).toHaveLength(5);
  });
});
