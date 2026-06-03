import { describe, it, expect } from "vitest";
import { planCaseActions } from "./case-actions";
import type { Exposure, RemovalRequest } from "@/lib/types";

const exposure = (over: Partial<Exposure> = {}): Exposure => ({
  id: "exp_1",
  subjectId: "subj_1",
  category: "address",
  source: "data_broker",
  sourceName: "Spokeo",
  snippet: "Listing found",
  riskLevel: "high",
  riskScore: 40,
  status: "discovered",
  discoveredAt: "2026-01-01T00:00:00.000Z",
  lastSeenAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

const ctx = (exposures: Exposure[], existingRemovals: RemovalRequest[] = []) => ({
  subjectName: "Jordan Vance",
  exposures,
  existingRemovals,
  now: "2026-06-03T00:00:00.000Z",
});

describe("planCaseActions", () => {
  it("files broker opt-outs and drafts an opt-out letter for a removal case", () => {
    const plan = planCaseActions(
      { type: "data_broker_removal", title: "Remove Spokeo listing", subjectId: "subj_1" },
      ctx([exposure({ id: "exp_1", sourceName: "Spokeo" }), exposure({ id: "exp_2", sourceName: "Radaris" })]),
    );
    expect(plan.removals.length).toBe(2);
    expect(plan.removals.map((r) => r.brokerName).sort()).toEqual(["Radaris", "Spokeo"]);
    expect(plan.relatedExposureIds.sort()).toEqual(["exp_1", "exp_2"]);
    expect(plan.legal?.type).toBe("broker_optout");
    // The drafted letter is personalized and addressed to a real broker.
    expect(plan.legal?.body).toContain("Jordan Vance");
    expect(["Spokeo", "Radaris"]).toContain(plan.legal?.recipient);
  });

  it("does not double-file brokers that already have a removal in flight", () => {
    const existing: RemovalRequest = {
      id: "rem_1",
      subjectId: "subj_1",
      brokerName: "Spokeo",
      status: "in_progress",
      submittedAt: "2026-05-01T00:00:00.000Z",
      history: [],
    };
    const plan = planCaseActions(
      { type: "data_broker_removal", title: "Remove listings", subjectId: "subj_1" },
      ctx([exposure({ id: "exp_1", sourceName: "Spokeo" }), exposure({ id: "exp_2", sourceName: "Radaris" })], [existing]),
    );
    expect(plan.removals.map((r) => r.brokerName)).toEqual(["Radaris"]);
  });

  it("respects the maxRemovals cap", () => {
    const plan = planCaseActions(
      { type: "data_broker_removal", title: "Remove all", subjectId: "subj_1" },
      { ...ctx([exposure({ id: "a", sourceName: "Spokeo" }), exposure({ id: "b", sourceName: "Radaris" }), exposure({ id: "c", sourceName: "WhitePages" })]), maxRemovals: 1 },
    );
    expect(plan.removals.length).toBe(1);
  });

  it("drafts a defamation complaint for a reputation case and files no removals", () => {
    const plan = planCaseActions(
      { type: "reputation_recovery", title: "False article on TechCrunch", subjectId: "subj_1" },
      ctx([exposure({ source: "news", sourceName: "TechCrunch", category: "employer", riskLevel: "critical" })]),
    );
    expect(plan.removals).toHaveLength(0);
    expect(plan.legal?.type).toBe("defamation_complaint");
    expect(plan.legal?.recipient).toBe("TechCrunch");
  });

  it("drafts a platform-abuse report for impersonation and deepfake cases", () => {
    for (const type of ["impersonation_takedown", "deepfake_incident"] as const) {
      const plan = planCaseActions(
        { type, title: "Fake profile", subjectId: "subj_1" },
        ctx([exposure({ source: "social_media", sourceName: "X" })]),
      );
      expect(plan.legal?.type).toBe("platform_abuse");
    }
  });

  it("opens no legal draft for a breach-response case", () => {
    const plan = planCaseActions(
      { type: "breach_response", title: "Credential leak", subjectId: "subj_1" },
      ctx([exposure({ source: "breach_db", sourceName: "Acme", category: "credential" })]),
    );
    expect(plan.removals).toHaveLength(0);
    expect(plan.legal).toBeUndefined();
  });
});
