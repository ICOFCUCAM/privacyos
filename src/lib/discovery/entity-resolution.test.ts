import { describe, expect, it } from "vitest";
import {
  clusterExposures,
  dedupeExposures,
  jaccard,
  removeKnownEntities,
  sameEntity,
  tokenize,
} from "./entity-resolution";
import type { Exposure } from "@/lib/types";

function exp(over: Partial<Exposure>): Exposure {
  const now = new Date().toISOString();
  return {
    id: "e", subjectId: "s", category: "name", source: "search_engine", sourceName: "Google",
    snippet: "", riskLevel: "medium", riskScore: 20, status: "discovered",
    discoveredAt: now, lastSeenAt: now, ...over,
  };
}

describe("entity resolution", () => {
  it("computes jaccard similarity", () => {
    expect(jaccard(tokenize("Jordan Vance address"), tokenize("Jordan Vance address"))).toBe(1);
    expect(jaccard(tokenize("alpha beta"), tokenize("gamma delta"))).toBe(0);
  });

  it("never merges different categories", () => {
    const a = exp({ category: "name", snippet: "Jordan Vance" });
    const b = exp({ category: "address", snippet: "Jordan Vance" });
    expect(sameEntity(a, b)).toBe(false);
  });

  it("merges the same page seen by two different layers via URL host", () => {
    const a = exp({ id: "1", source: "search_engine", category: "employer", url: "https://techcrunch.com/x?ref=google", snippet: "lawsuit filed" });
    const b = exp({ id: "2", source: "news", sourceName: "TechCrunch", category: "employer", url: "https://www.techcrunch.com/x", snippet: "a lawsuit was filed today" });
    expect(sameEntity(a, b)).toBe(true);
  });

  it("merges same-broker near-duplicate snippets", () => {
    const a = exp({ id: "1", source: "data_broker", sourceName: "Spokeo", category: "address", snippet: "Jordan Vance 88 Marina Blvd San Francisco" });
    const b = exp({ id: "2", source: "data_broker", sourceName: "Spokeo", category: "address", snippet: "Jordan Vance, 88 Marina Blvd, San Francisco CA" });
    expect(sameEntity(a, b)).toBe(true);
  });

  it("keeps distinct breaches separate (same source, different listing)", () => {
    const a = exp({ id: "1", source: "breach_db", sourceName: "LinkedIn", category: "credential", snippet: "a@x.com in LinkedIn breach" });
    const b = exp({ id: "2", source: "breach_db", sourceName: "Dropbox", category: "credential", snippet: "a@x.com in Dropbox breach" });
    expect(sameEntity(a, b)).toBe(false);
  });

  it("clusters and picks the highest-risk representative", () => {
    const a = exp({ id: "1", source: "data_broker", sourceName: "Spokeo", category: "address", snippet: "Jordan Vance 88 Marina Blvd", riskLevel: "medium" });
    const b = exp({ id: "2", source: "data_broker", sourceName: "Spokeo", category: "address", snippet: "Jordan Vance 88 Marina Blvd SF", riskLevel: "high" });
    const c = exp({ id: "3", category: "phone", source: "data_broker", sourceName: "WhitePages", snippet: "555-0142" });
    const clusters = clusterExposures([a, b, c]);
    expect(clusters).toHaveLength(2);
    const addressCluster = clusters.find((cl) => cl.representative.category === "address")!;
    expect(addressCluster.members).toHaveLength(2);
    expect(addressCluster.representative.id).toBe("2"); // higher risk
    expect(dedupeExposures([a, b, c])).toHaveLength(2);
  });

  it("removes candidates already known in the footprint", () => {
    const existing = [exp({ id: "x", source: "data_broker", sourceName: "Spokeo", category: "address", snippet: "Jordan Vance 88 Marina Blvd" })];
    const candidate = exp({ id: "y", source: "data_broker", sourceName: "Spokeo", category: "address", snippet: "Jordan Vance 88 Marina Blvd SF" });
    const fresh = exp({ id: "z", category: "username", source: "social_media", sourceName: "X", snippet: "@jvance" });
    const out = removeKnownEntities([candidate, fresh], existing);
    expect(out.map((e) => e.id)).toEqual(["z"]);
  });
});
