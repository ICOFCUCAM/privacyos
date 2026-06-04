import { describe, it, expect, vi } from "vitest";
import {
  mapLensMatches,
  simulateReverseImage,
  ReverseImageConnector,
  type LensMatch,
} from "./reverse-image-connector";
import type { Subject } from "@/lib/types";

const subject: Subject = {
  id: "subj-1", type: "individual", displayName: "Jordan Vance",
  emails: [], phones: [], usernames: [], photos: ["https://cdn.example.com/jordan.jpg"],
  createdAt: "2026-01-01T00:00:00Z",
};

function jsonResponse(body: unknown): Response {
  return { ok: true, status: 200, json: async () => body } as Response;
}

describe("mapLensMatches", () => {
  it("flags social-domain matches as impersonation threats + photo exposures", () => {
    const matches: LensMatch[] = [
      { title: "Fake profile", link: "https://www.instagram.com/imposter", source: "Instagram" },
      { title: "Blog mention", link: "https://news-blog.com/article", source: "News Blog" },
      { title: "no link" },
    ];
    const f = mapLensMatches(matches, subject, "img");
    // Two valid matches → two photo exposures (the "no link" one is dropped).
    expect(f.exposures).toHaveLength(2);
    expect(f.exposures.every((e) => e.category === "photo")).toBe(true);
    // Social hit → social_media source + an impersonation threat; blog → search_engine, no threat.
    expect(f.exposures.find((e) => e.url?.includes("instagram"))?.source).toBe("social_media");
    expect(f.exposures.find((e) => e.url?.includes("news-blog"))?.source).toBe("search_engine");
    expect(f.threats).toHaveLength(1);
    expect(f.threats[0]).toMatchObject({ kind: "impersonation", riskLevel: "high" });
  });

  it("dedupes multiple matches on the same domain", () => {
    const f = mapLensMatches(
      [
        { title: "A", link: "https://instagram.com/a" },
        { title: "B", link: "https://www.instagram.com/b" },
      ],
      subject,
      "img",
    );
    expect(f.exposures).toHaveLength(1); // one per distinct domain
  });

  it("produces stable ids for the same subject + domain", () => {
    const a = mapLensMatches([{ title: "X", link: "https://x.com/p" }], subject, "img");
    const b = mapLensMatches([{ title: "Y", link: "https://x.com/q" }], subject, "img");
    expect(a.exposures[0].id).toBe(b.exposures[0].id);
  });
});

describe("simulateReverseImage", () => {
  it("returns deterministic demo findings keyed on the subject", () => {
    const a = simulateReverseImage(subject);
    const b = simulateReverseImage(subject);
    expect(a.exposures.length).toBeGreaterThan(0);
    expect(a.exposures.map((e) => e.id)).toEqual(b.exposures.map((e) => e.id));
  });
});

describe("ReverseImageConnector", () => {
  it("uses the offline simulator when no key is set", async () => {
    const f = await new ReverseImageConnector(undefined).scan({ subject, existing: [] });
    expect(f.exposures.length).toBeGreaterThan(0);
  });

  it("no-ops (no fabricated findings) when keyed but the subject has no photo", async () => {
    const noPhoto: Subject = { ...subject, photos: [] };
    const fetchImpl = vi.fn();
    const f = await new ReverseImageConnector("key", fetchImpl as unknown as typeof fetch).scan({ subject: noPhoto, existing: [] });
    expect(f.exposures).toEqual([]);
    expect(f.threats).toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled(); // never hits the network without a photo
  });

  it("maps live Google Lens visual matches when keyed with a photo", async () => {
    const body = { visual_matches: [{ title: "Imposter", link: "https://instagram.com/imposter", source: "Instagram" }] };
    const ok = new ReverseImageConnector("key", vi.fn(async () => jsonResponse(body)) as unknown as typeof fetch);
    const f = await ok.scan({ subject, existing: [] });
    expect(f.exposures).toHaveLength(1);
    expect(f.threats[0].kind).toBe("impersonation");
  });

  it("skips the scan when the budget meter denies", async () => {
    const fetchImpl = vi.fn();
    const f = await new ReverseImageConnector("key", fetchImpl as unknown as typeof fetch)
      .scan({ subject, existing: [], meter: { consume: async () => false } });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(f.exposures).toEqual([]);
  });

  it("degrades silently on network error (never throws)", async () => {
    const bad = new ReverseImageConnector("key", vi.fn(async () => { throw new Error("net"); }) as unknown as typeof fetch);
    const f = await bad.scan({ subject, existing: [] });
    expect(f.exposures).toEqual([]);
    expect(f.log.some((l) => l.includes("failed"))).toBe(true);
  });
});
