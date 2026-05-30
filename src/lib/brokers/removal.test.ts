import { describe, expect, it } from "vitest";
import { advanceRemoval, createRemoval, isRemovalDue, shouldReappear } from "./removal";
import type { RemovalRequest } from "@/lib/types";

function seed(): RemovalRequest {
  return { id: "r1", ...createRemoval("Spokeo", { subjectId: "s1", now: "2026-01-01T00:00:00Z" }) };
}

describe("removal workflow", () => {
  it("progresses requested → in_progress → removed and schedules a 30-day re-check", () => {
    let r = seed();
    expect(r.status).toBe("removal_requested");
    r = advanceRemoval(r, { now: "2026-01-02T00:00:00Z" });
    expect(r.status).toBe("in_progress");
    r = advanceRemoval(r, { now: "2026-01-09T00:00:00Z" });
    expect(r.status).toBe("removed");
    expect(r.nextCheckAt).toBe("2026-02-08T00:00:00.000Z"); // +30 days
  });

  it("escalates cadence 30 → 60 → 90 across passing re-checks", () => {
    let r = seed();
    r = advanceRemoval(r, {}); // in_progress
    r = advanceRemoval(r, {}); // removed (+30)
    r = advanceRemoval(r, { reappeared: false }); // monitoring (+60)
    const after60 = r.history.at(-1)!.note;
    expect(after60).toContain("60 days");
    r = advanceRemoval(r, { reappeared: false }); // monitoring (+90)
    expect(r.history.at(-1)!.note).toContain("90 days");
  });

  it("re-files when a listing reappears", () => {
    let r = seed();
    r = advanceRemoval(r, {}); // in_progress
    r = advanceRemoval(r, {}); // removed
    r = advanceRemoval(r, { reappeared: true });
    expect(r.status).toBe("reappeared");
    r = advanceRemoval(r, {});
    expect(r.status).toBe("removal_requested");
  });

  it("marks requested/in_progress as always due, monitoring only when the check date passes", () => {
    const r = seed();
    expect(isRemovalDue(r, "2026-01-01T00:00:00Z")).toBe(true);
    const monitoring: RemovalRequest = { ...r, status: "monitoring", nextCheckAt: "2026-03-01T00:00:00Z" };
    expect(isRemovalDue(monitoring, "2026-02-01T00:00:00Z")).toBe(false);
    expect(isRemovalDue(monitoring, "2026-03-02T00:00:00Z")).toBe(true);
  });

  it("reappearance predicate is deterministic", () => {
    expect(shouldReappear("Spokeo")).toBe(shouldReappear("Spokeo"));
  });
});
