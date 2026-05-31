import { describe, it, expect } from "vitest";
import { brokerTable, coverageSummary, removalPipeline } from "./intelligence";
import { BROKERS } from "./registry";
import type { RemovalRequest } from "@/lib/types";

const removal = (over: Partial<RemovalRequest>): RemovalRequest => ({
  id: Math.random().toString(36).slice(2), subjectId: "s1", brokerName: "Spokeo",
  status: "in_progress", submittedAt: "2026-05-30T00:00:00Z",
  history: [{ at: "2026-05-30T00:00:00Z", status: "in_progress", note: "Filed" }], ...over,
});

describe("brokerTable", () => {
  it("returns one row per registry broker", () => {
    expect(brokerTable([])).toHaveLength(BROKERS.length);
  });

  it("marks brokers with no request as 'covered'", () => {
    const rows = brokerTable([]);
    expect(rows.every((r) => r.state === "covered")).toBe(true);
  });

  it("joins a removal request to its broker and maps status to state", () => {
    const rows = brokerTable([removal({ brokerName: "Spokeo", status: "removed" })]);
    const spokeo = rows.find((r) => r.broker.name === "Spokeo")!;
    expect(spokeo.state).toBe("removed");
    expect(spokeo.request).toBeDefined();
    expect(spokeo.lastCheck).toBeTruthy();
  });

  it("sorts urgent states (reappeared, in_progress) first", () => {
    const rows = brokerTable([
      removal({ brokerName: "Spokeo", status: "removed" }),
      removal({ brokerName: "Radaris", status: "reappeared" }),
      removal({ brokerName: "Intelius", status: "in_progress" }),
    ]);
    expect(rows[0].state).toBe("reappeared");
    expect(rows[1].state).toBe("in_progress");
  });
});

describe("removalPipeline", () => {
  it("counts each lifecycle stage", () => {
    const p = removalPipeline([
      removal({ status: "discovered" }),
      removal({ status: "in_progress" }),
      removal({ status: "removed" }),
      removal({ status: "monitoring" }),
      removal({ status: "reappeared" }),
    ]);
    expect(p.find((s) => s.key === "found")!.count).toBe(1);
    expect(p.find((s) => s.key === "submitted")!.count).toBe(1);
    expect(p.find((s) => s.key === "confirmed")!.count).toBe(1);
    expect(p.find((s) => s.key === "monitoring")!.count).toBe(1);
    expect(p.find((s) => s.key === "reappeared")!.count).toBe(1);
  });
});

describe("coverageSummary", () => {
  it("reports total brokers and category breakdown", () => {
    const c = coverageSummary([]);
    expect(c.totalBrokers).toBe(BROKERS.length);
    expect(c.categories.length).toBeGreaterThan(0);
    expect(c.categories.reduce((s, x) => s + x.count, 0)).toBe(BROKERS.length);
  });

  it("computes success rate from removed/monitoring over ever-exposed", () => {
    const c = coverageSummary([
      removal({ brokerName: "Spokeo", status: "removed" }),
      removal({ brokerName: "Radaris", status: "monitoring" }),
      removal({ brokerName: "Intelius", status: "in_progress" }),
      removal({ brokerName: "MyLife", status: "reappeared" }),
    ]);
    expect(c.protectedCount).toBe(2);
    expect(c.active).toBe(1);
    expect(c.reappeared).toBe(1);
    expect(c.successRate).toBe(50); // 2 protected / 4 exposed
  });

  it("treats an empty book as 100% (nothing exposed)", () => {
    expect(coverageSummary([]).successRate).toBe(100);
  });
});
