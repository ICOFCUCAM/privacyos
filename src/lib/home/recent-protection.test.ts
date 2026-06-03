import { describe, it, expect } from "vitest";
import { summarizeRecentProtection } from "./recent-protection";
import type { AgentAction } from "@/lib/suite-types";

const NOW = new Date("2026-06-02T12:00:00Z").getTime();
const at = (hoursAgo: number) => new Date(NOW - hoursAgo * 3_600_000).toISOString();
const action = (over: Partial<AgentAction> = {}): AgentAction => ({
  id: Math.random().toString(36).slice(2), agent: "privacy", kind: "remove", summary: "Filed opt-out",
  status: "completed", createdAt: at(1), ...over,
});

describe("summarizeRecentProtection", () => {
  it("counts completed autonomous actions by kind within the window", () => {
    const r = summarizeRecentProtection(
      [
        action({ kind: "remove" }),
        action({ kind: "remove" }),
        action({ kind: "escalate" }),
        action({ kind: "scan" }),
        action({ kind: "monitor" }),
      ],
      { now: NOW },
    );
    expect(r.total).toBe(5);
    expect(r.removals).toBe(2);
    expect(r.cases).toBe(1);
    expect(r.scans).toBe(1);
    expect(r.monitors).toBe(1);
  });

  it("excludes anything outside the window or not completed", () => {
    const r = summarizeRecentProtection(
      [
        action({ createdAt: at(48) }),          // too old
        action({ status: "running" }),          // not completed
        action({ createdAt: at(2) }),           // counts
      ],
      { now: NOW, windowHours: 24 },
    );
    expect(r.total).toBe(1);
  });

  it("returns the newest actions first, capped by limit", () => {
    const r = summarizeRecentProtection(
      [action({ summary: "old", createdAt: at(5) }), action({ summary: "new", createdAt: at(1) })],
      { now: NOW, limit: 1 },
    );
    expect(r.latest).toHaveLength(1);
    expect(r.latest[0].summary).toBe("new");
  });
});
