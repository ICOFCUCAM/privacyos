import { describe, it, expect } from "vitest";
import { groupInvestigationRows } from "./investigation-store";

describe("groupInvestigationRows", () => {
  it("groups steps by threat id and sorts each chronologically", () => {
    const map = groupInvestigationRows([
      { threat_id: "t1", agent: "threat_intel", label: "Confirmed", created_at: "2026-05-30T10:06:00Z" },
      { threat_id: "t1", agent: "discovery", label: "Surfaced", created_at: "2026-05-30T10:00:00Z" },
      { threat_id: "t2", agent: "discovery", label: "Surfaced", created_at: "2026-05-30T11:00:00Z" },
    ]);
    expect(map.size).toBe(2);
    expect(map.get("t1")!.map((s) => s.agent)).toEqual(["discovery", "threat_intel"]); // sorted by time
    expect(map.get("t2")).toHaveLength(1);
  });

  it("returns an empty map for no rows", () => {
    expect(groupInvestigationRows([]).size).toBe(0);
  });
});
