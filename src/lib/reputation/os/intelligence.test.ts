import { describe, it, expect } from "vitest";
import { discoverOpportunities, summarizeOpportunities, opportunityLabel } from "./intelligence";
import type { Subject } from "@/lib/types";

const subject: Subject = {
  id: "s1", type: "individual", displayName: "Jordan Avery", emails: ["j@x.com"], phones: [],
  usernames: [], organization: "Avery Capital", createdAt: "2026-01-01T00:00:00Z",
};

describe("reputation intelligence engine", () => {
  it("discovers opportunities and summarizes them", () => {
    const opps = discoverOpportunities(subject);
    expect(opps.length).toBeGreaterThan(0);
    const summary = summarizeOpportunities(opps);
    expect(summary).toBeDefined();
  });

  it("labels opportunity types", () => {
    expect(opportunityLabel("podcast").length).toBeGreaterThan(0);
  });
});
