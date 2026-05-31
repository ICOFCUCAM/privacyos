import { describe, it, expect } from "vitest";
import { assessVendor, summarizeVendors, vendorRegister, REVIEW_CADENCE_DAYS } from "./vendor-risk";
import type { ThirdPartyRisk } from "@/lib/suite-types";

const NOW = new Date("2026-05-31T00:00:00Z").getTime();
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();

const vendor = (over: Partial<ThirdPartyRisk>): ThirdPartyRisk => ({
  id: Math.random().toString(36).slice(2), vendorName: "Acme", category: "SaaS",
  riskScore: 40, riskLevel: "medium", findings: "No issues found.", assessedAt: daysAgo(10), ...over,
});

describe("assessVendor", () => {
  it("derives cadence + freshness from the risk tier", () => {
    const a = assessVendor(vendor({ riskLevel: "high", assessedAt: daysAgo(100) }), NOW);
    expect(a.cadenceDays).toBe(REVIEW_CADENCE_DAYS.high);
    expect(a.daysSinceAssessment).toBe(100);
    expect(a.reviewStatus).toBe("overdue"); // 100 >= 90
  });

  it("marks a recently-assessed low-risk vendor current", () => {
    const a = assessVendor(vendor({ riskLevel: "low", assessedAt: daysAgo(10) }), NOW);
    expect(a.reviewStatus).toBe("current");
    expect(a.stage).toBe("Monitoring");
  });

  it("derives findings-specific remediation actions", () => {
    const a = assessVendor(vendor({ riskLevel: "high", findings: "Recent breach disclosure; PII affected." }), NOW);
    expect(a.recommendedActions.join(" ")).toMatch(/breach scope/i);
    expect(a.recommendedActions.join(" ")).toMatch(/least privilege/i);
    expect(a.stage).toBe("Remediation");
  });

  it("escalates offboarding for critical vendors", () => {
    const a = assessVendor(vendor({ riskLevel: "critical" }), NOW);
    expect(a.recommendedActions.some((x) => /offboarding|formal security review/i.test(x))).toBe(true);
  });
});

describe("summarizeVendors", () => {
  it("summarizes the portfolio and concentration", () => {
    const p = summarizeVendors([
      vendor({ riskLevel: "high", riskScore: 72, category: "Payroll" }),
      vendor({ riskLevel: "medium", riskScore: 41, category: "Email" }),
      vendor({ riskLevel: "low", riskScore: 23, category: "Payroll" }),
    ], NOW);
    expect(p.total).toBe(3);
    expect(p.highRisk).toBe(1);
    expect(p.avgScore).toBe(45);
    expect(p.concentration[0]).toEqual({ category: "Payroll", count: 2 });
  });

  it("flags critical posture when a critical vendor is present", () => {
    const p = summarizeVendors([vendor({ riskLevel: "critical", riskScore: 90 })], NOW);
    expect(p.postureLevel).toBe("critical");
    expect(p.posture).toBeLessThan(100);
  });

  it("is fully managed for a clean low-risk portfolio", () => {
    const p = summarizeVendors([vendor({ riskLevel: "low", assessedAt: daysAgo(5) })], NOW);
    expect(p.postureLevel).toBe("managed");
    expect(p.overdueReviews).toBe(0);
  });
});

describe("vendorRegister", () => {
  it("orders overdue and highest-risk first", () => {
    const reg = vendorRegister([
      vendor({ vendorName: "Current-Low", riskLevel: "low", assessedAt: daysAgo(5) }),
      vendor({ vendorName: "Overdue-High", riskLevel: "high", assessedAt: daysAgo(120) }),
      vendor({ vendorName: "Current-Med", riskLevel: "medium", assessedAt: daysAgo(5) }),
    ], NOW);
    expect(reg[0].vendor.vendorName).toBe("Overdue-High");
  });
});
