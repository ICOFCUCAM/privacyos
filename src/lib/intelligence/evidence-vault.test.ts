import { describe, it, expect } from "vitest";
import {
  actionEvidence, buildEvidence, evidenceStats, filterEvidence, sealHash, shortHash,
} from "./evidence-vault";
import type { Case, Exposure, Threat } from "@/lib/types";

const exposure = (over: Partial<Exposure>): Exposure => ({
  id: "e1", subjectId: "s", category: "address", source: "data_broker", sourceName: "Spokeo",
  snippet: "123 Main St", riskLevel: "high", riskScore: 30, status: "discovered",
  discoveredAt: "2026-05-01T00:00:00Z", lastSeenAt: "2026-05-02T00:00:00Z", ...over,
});

const threat = (over: Partial<Threat>): Threat => ({
  id: "t1", subjectId: "s", kind: "credential_leak", title: "Leak", detail: "creds",
  riskLevel: "critical", source: "dark_web", detectedAt: "2026-05-03T00:00:00Z", acknowledged: false, ...over,
});

const kase = (over: Partial<Case>): Case => ({
  id: "c1", subjectId: "s", type: "breach_response", title: "Leak", summary: "", status: "open",
  riskLevel: "critical", assignedAgent: "security", relatedExposureIds: [], createdAt: "", updatedAt: "", ...over,
});

describe("sealHash", () => {
  it("is a stable 64-char sha256 that changes with content", () => {
    const a = sealHash(["x", 1]);
    expect(a).toHaveLength(64);
    expect(sealHash(["x", 1])).toBe(a);        // deterministic
    expect(sealHash(["x", 2])).not.toBe(a);     // content-sensitive
  });
  it("shortens for display", () => {
    expect(shortHash("a".repeat(64))).toMatch(/^a{8}…a{4}$/);
  });
});

describe("buildEvidence", () => {
  it("turns exposures and threats into sealed items, newest first", () => {
    const items = buildEvidence([exposure({})], [threat({})], []);
    expect(items).toHaveLength(2);
    expect(items[0].collectedAt >= items[1].collectedAt).toBe(true); // sorted desc
    expect(items.every((i) => i.hash.length === 64)).toBe(true);
    expect(items.every((i) => i.custody.length >= 2)).toBe(true);
  });

  it("links evidence to its case (exposure by id, threat by title)", () => {
    const items = buildEvidence(
      [exposure({ id: "e9" })],
      [threat({ title: "Leak" })],
      [kase({ id: "cX", title: "Leak", relatedExposureIds: ["e9"] })],
    );
    const exp = items.find((i) => i.kind === "exposure_record")!;
    const thr = items.find((i) => i.kind === "threat_detection")!;
    expect(exp.caseId).toBe("cX");
    expect(thr.caseId).toBe("cX");
  });

  it("assigns the right analysing custodian per threat kind", () => {
    const [d] = buildEvidence([], [threat({ kind: "deepfake" })], []);
    expect(d.custody.some((c) => c.actor === "deepfake")).toBe(true);
  });
});

describe("actionEvidence", () => {
  const base = {
    subjectId: "s", action: "Filed broker opt-out: Spokeo", detail: "status removal_requested",
    source: "Spokeo", riskLevel: "medium" as const, collectedBy: "privacy" as const,
    collectedAt: "2026-05-04T00:00:00Z",
  };

  it("seals an autonomous action into a case_artifact with custody", () => {
    const ev = actionEvidence(base);
    expect(ev.kind).toBe("case_artifact");
    expect(ev.title).toBe("Filed broker opt-out: Spokeo");
    expect(ev.hash).toHaveLength(64);
    expect(ev.collectedBy).toBe("privacy");
    // collector step + system seal
    expect(ev.custody).toHaveLength(2);
    expect(ev.custody[1].actor).toBe("system");
  });

  it("is deterministic and content-sensitive (id derives from the seal)", () => {
    expect(actionEvidence(base).id).toBe(actionEvidence(base).id);
    expect(actionEvidence({ ...base, detail: "changed" }).hash).not.toBe(actionEvidence(base).hash);
  });

  it("carries the supporting case link when given one", () => {
    const ev = actionEvidence({ ...base, action: "Opened case: Leak", caseTitle: "Leak" });
    expect(ev.caseTitle).toBe("Leak");
  });
});

describe("stats + filtering", () => {
  it("summarizes the catalog", () => {
    const items = buildEvidence([exposure({})], [threat({ title: "T-a" }), threat({ id: "t2", title: "T-b", riskLevel: "low" })], [kase({ title: "Unrelated", relatedExposureIds: ["e1"] })]);
    const s = evidenceStats(items);
    expect(s.total).toBe(3);
    expect(s.byKind.threat_detection).toBe(2);
    expect(s.linkedToCases).toBe(1);
    expect(s.sealed).toBe(3);
  });

  it("filters by kind, link and risk", () => {
    const items = buildEvidence([exposure({})], [threat({})], [kase({ title: "Leak" })]);
    expect(filterEvidence(items, "threat_detection").every((i) => i.kind === "threat_detection")).toBe(true);
    expect(filterEvidence(items, "linked").every((i) => i.caseId)).toBe(true);
    expect(filterEvidence(items, "critical").every((i) => i.riskLevel === "critical")).toBe(true);
    expect(filterEvidence(items, "all")).toHaveLength(2);
  });
});
