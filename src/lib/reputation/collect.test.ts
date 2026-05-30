import { describe, expect, it } from "vitest";
import { collectReputation, type MentionSource } from "./collect";
import { mapGdeltArticles, sampleMentions } from "./news-connector";

const fakeSource: MentionSource = {
  async fetch() {
    return {
      live: true,
      mentions: [
        { channel: "news", sourceName: "x.com", url: "u1", title: "Acme wins award for record growth", excerpt: "Acme wins award for record growth", detectedAt: "2026-01-02T00:00:00Z" },
        { channel: "news", sourceName: "y.com", url: "u2", title: "Acme hit by fraud lawsuit and scandal", excerpt: "Acme hit by fraud lawsuit and scandal", detectedAt: "2026-01-02T10:00:00Z" },
        { channel: "news", sourceName: "y.com", url: "u2", title: "dupe", excerpt: "dupe", detectedAt: "2026-01-02T11:00:00Z" },
      ],
    };
  },
};

describe("reputation collection", () => {
  it("scores sentiment and dedupes by url", async () => {
    const res = await collectReputation({ displayName: "Acme" }, fakeSource);
    expect(res.mentions).toHaveLength(2); // dupe removed
    const positive = res.mentions.find((m) => m.title.includes("award"))!;
    const negative = res.mentions.find((m) => m.title.includes("fraud"))!;
    expect(positive.sentiment).toBe("positive");
    expect(negative.sentiment).toBe("negative");
    expect(res.live).toBe(true);
  });

  it("flags defamatory negative mentions", async () => {
    const res = await collectReputation({ displayName: "Acme" }, fakeSource);
    const negative = res.mentions.find((m) => m.title.includes("fraud"))!;
    expect(negative.isDefamatory).toBe(true);
  });

  it("builds a daily sentiment series", async () => {
    const res = await collectReputation({ displayName: "Acme" }, fakeSource);
    expect(res.sentimentByDay).toHaveLength(1);
    expect(res.sentimentByDay[0].date).toBe("2026-01-02");
    expect(res.sentimentByDay[0].positive + res.sentimentByDay[0].negative).toBe(2);
  });

  it("maps GDELT articles, dropping ones without title/url", () => {
    const mapped = mapGdeltArticles([
      { title: "A", url: "http://a", domain: "a.com", seendate: "20260115T120000Z" },
      { title: "no url" },
      { url: "http://b" },
    ]);
    expect(mapped).toHaveLength(1);
    expect(mapped[0].detectedAt).toBe("2026-01-15T12:00:00.000Z");
  });

  it("sample fallback yields deterministic mentions", () => {
    expect(sampleMentions("Acme").length).toBeGreaterThan(0);
  });
});
