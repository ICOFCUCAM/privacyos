import { describe, it, expect } from "vitest";
import { brokerForExposure, planAutoFilings } from "./auto-file";
import type { Exposure, RemovalRequest } from "@/lib/types";

const exposure = (over: Partial<Exposure>): Exposure => ({
  id: Math.random().toString(36).slice(2), subjectId: "s1", category: "address",
  source: "data_broker", sourceName: "Spokeo", snippet: "", riskLevel: "high",
  riskScore: 30, status: "discovered", discoveredAt: "2026-05-30T00:00:00Z",
  lastSeenAt: "2026-05-31T00:00:00Z", ...over,
});

describe("brokerForExposure", () => {
  it("matches by exact source name", () => {
    expect(brokerForExposure(exposure({ sourceName: "Spokeo" }))?.id).toBe("spokeo");
  });
  it("matches fuzzily on a descriptive source name", () => {
    expect(brokerForExposure(exposure({ sourceName: "WhitePages people search" }))?.id).toBe("whitepages");
  });
  it("returns undefined for an unknown source", () => {
    expect(brokerForExposure(exposure({ sourceName: "SomeRandomSite" }))).toBeUndefined();
  });
});

describe("planAutoFilings", () => {
  it("queues a removal for a matched, removable exposure", () => {
    const plan = planAutoFilings("s1", [exposure({ sourceName: "Spokeo" })], []);
    expect(plan.matched).toBe(1);
    expect(plan.requests).toHaveLength(1);
    expect(plan.requests[0].brokerName).toBe("Spokeo");
    expect(plan.requests[0].status).toBe("removal_requested");
    expect(plan.requests[0].subjectId).toBe("s1");
  });

  it("ignores non-removable sources (dark web, ai_generated)", () => {
    const plan = planAutoFilings("s1", [
      exposure({ source: "dark_web", sourceName: "BreachForums" }),
      exposure({ source: "ai_generated", sourceName: "Telegram" }),
    ], []);
    expect(plan.matched).toBe(0);
    expect(plan.requests).toHaveLength(0);
  });

  it("does not double-file a broker that already has a removal", () => {
    const existing: RemovalRequest[] = [{
      id: "x", subjectId: "s1", brokerName: "Spokeo", status: "in_progress",
      submittedAt: "2026-05-30T00:00:00Z", history: [],
    }];
    const plan = planAutoFilings("s1", [exposure({ sourceName: "Spokeo" })], existing);
    expect(plan.matched).toBe(0);
  });

  it("dedupes multiple exposures from the same broker within one cycle", () => {
    const plan = planAutoFilings("s1", [
      exposure({ sourceName: "Spokeo", category: "address" }),
      exposure({ sourceName: "Spokeo", category: "phone" }),
    ], []);
    expect(plan.matched).toBe(1);
  });

  it("counts removable-but-unmatched exposures", () => {
    const plan = planAutoFilings("s1", [exposure({ source: "data_broker", sourceName: "ObscureBrokerXYZ" })], []);
    expect(plan.matched).toBe(0);
    expect(plan.unmatched).toBe(1);
  });

  it("honors the maxNew allowance cap", () => {
    const plan = planAutoFilings("s1", [
      exposure({ sourceName: "Spokeo" }),
      exposure({ sourceName: "WhitePages" }),
      exposure({ sourceName: "Radaris" }),
    ], [], { maxNew: 2 });
    expect(plan.requests).toHaveLength(2);
  });
});
