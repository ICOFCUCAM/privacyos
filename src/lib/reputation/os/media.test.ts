import { describe, it, expect } from "vitest";
import { pressOpportunities, journalistDatabase, generatePressRelease, outreachWorkflow } from "./media";
import type { Subject } from "@/lib/types";
import type { Mention } from "@/lib/suite-types";

const subject: Subject = {
  id: "s1", type: "individual", displayName: "Jordan Avery", emails: ["j@x.com"], phones: [],
  usernames: [], organization: "Avery Capital", createdAt: "2026-01-01T00:00:00Z",
};
const mention = (): Mention => ({
  id: "m1", subjectId: "s1", channel: "news", sourceName: "Outlet", title: "t", excerpt: "e",
  sentiment: "positive", sentimentScore: 0.6, isDefamatory: false, detectedAt: "2026-01-01T00:00:00Z",
});

describe("reputation media engine", () => {
  it("surfaces press opportunities and a journalist database", () => {
    expect(pressOpportunities(subject).length).toBeGreaterThan(0);
    expect(journalistDatabase(subject).length).toBeGreaterThan(0);
  });

  it("generates a press release naming the subject", () => {
    const pr = generatePressRelease(subject, [mention()]);
    expect(pr.headline.length).toBeGreaterThan(0);
    expect(`${pr.headline} ${pr.body.join(" ")} ${pr.boilerplate}`).toContain("Jordan Avery");
  });

  it("produces an outreach workflow", () => {
    expect(outreachWorkflow().length).toBeGreaterThan(0);
  });
});
