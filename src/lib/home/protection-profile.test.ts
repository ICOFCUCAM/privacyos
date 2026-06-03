import { describe, it, expect } from "vitest";
import { classifyProtection } from "./protection-profile";
import { buildScaryMirror } from "./scary-mirror";
import type { Exposure, Threat, ExposureSource } from "@/lib/types";

const exposure = (source: ExposureSource, name: string, over: Partial<Exposure> = {}): Exposure => ({
  id: Math.random().toString(36).slice(2), subjectId: "s1", category: "address", source, sourceName: name,
  snippet: "", riskLevel: "high", riskScore: 10, status: "monitoring",
  discoveredAt: "2026-01-01T00:00:00Z", lastSeenAt: "2026-01-01T00:00:00Z", ...over,
});
const threat = (kind: Threat["kind"], over: Partial<Threat> = {}): Threat => ({
  id: Math.random().toString(36).slice(2), subjectId: "s1", kind, title: "t", detail: "",
  riskLevel: "high", source: "dark_web", detectedAt: "2026-01-01T00:00:00Z", acknowledged: false, ...over,
});

const mirror = (exposures: Exposure[], threats: Threat[] = []) =>
  buildScaryMirror({ name: "Jordan", exposures, threats });

describe("protection profiling", () => {
  it("classifies a broker-heavy footprint as personal and recommends a personal plan", () => {
    const r = classifyProtection(mirror([
      exposure("data_broker", "Spokeo"), exposure("data_broker", "Whitepages"), exposure("data_broker", "BeenVerified"),
    ]));
    expect(r.primary).toBe("personal");
    expect(["plus", "premium"]).toContain(r.planId);
  });

  it("classifies a reputation/news-heavy footprint as reputation", () => {
    const r = classifyProtection(mirror(
      [exposure("search_engine", "Old article"), exposure("news", "Negative piece")],
      [threat("negative_press"), threat("negative_press")],
    ));
    expect(r.primary).toBe("reputation");
    expect(r.planId).toBe("rep-professional");
  });

  it("recommends premium when personal exposure is heavy", () => {
    const many = Array.from({ length: 14 }, (_, i) => exposure("data_broker", `Broker${i}`));
    const r = classifyProtection(mirror(many));
    expect(r.primary).toBe("personal");
    expect(r.planId).toBe("premium");
  });

  it("computes the remaining-risk upgrade trigger (found / removing / remaining)", () => {
    const many = Array.from({ length: 25 }, (_, i) => exposure("data_broker", `Broker${i}`));
    const r = classifyProtection(mirror(many), 10);
    expect(r.found).toBe(25);
    expect(r.removing).toBe(10);          // free tier removes 10
    expect(r.remaining).toBe(15);         // the rest is the upgrade trigger
    expect(r.found).toBe(r.removing + r.remaining);
  });

  it("surfaces multiple matched profiles, strongest first", () => {
    const r = classifyProtection(mirror(
      [exposure("data_broker", "Spokeo"), exposure("social_media", "Profile")],
      [threat("negative_press")],
    ));
    expect(r.matches.length).toBeGreaterThan(1);
    expect(r.matches[0].score).toBeGreaterThanOrEqual(r.matches[1].score);
  });
});
