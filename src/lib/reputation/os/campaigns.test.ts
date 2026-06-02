import { describe, it, expect } from "vitest";
import {
  generateGrowthCampaign, generatePRPlan, generateRecoveryPlan, generateAllCampaigns,
} from "./campaigns";
import type { Subject } from "@/lib/types";
import type { Mention } from "@/lib/suite-types";

const subject: Subject = {
  id: "s1", type: "individual", displayName: "Jordan Avery", emails: ["j@x.com"], phones: [],
  usernames: [], organization: "Avery Capital", createdAt: "2026-01-01T00:00:00Z",
};
const mention = (): Mention => ({
  id: "m1", subjectId: "s1", channel: "news", sourceName: "Outlet", title: "t", excerpt: "e",
  sentiment: "negative", sentimentScore: -0.6, isDefamatory: false, detectedAt: "2026-01-01T00:00:00Z",
});

describe("reputation campaigns engine", () => {
  it("generates growth, PR and recovery campaigns", () => {
    for (const c of [generateGrowthCampaign(subject, []), generatePRPlan(subject), generateRecoveryPlan(subject, [mention()])]) {
      expect(c.name?.length ?? (c as { title?: string }).title?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it("generateAllCampaigns returns the full set", () => {
    const all = generateAllCampaigns(subject, [mention()]);
    expect(all.length).toBeGreaterThanOrEqual(3);
  });
});
