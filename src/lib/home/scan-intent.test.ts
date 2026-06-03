import { describe, it, expect } from "vitest";
import { encodeIntent, decodeIntent, profileToSubjectType, type ScanIntent } from "./scan-intent";

const intent: ScanIntent = {
  name: "Jordan Vance",
  planId: "plus",
  profile: "personal",
  found: 25,
  remaining: 15,
};

describe("scan intent", () => {
  it("round-trips an intent through encode/decode", () => {
    const decoded = decodeIntent(encodeIntent(intent));
    expect(decoded).toEqual(intent);
  });

  it("returns null for missing or garbage values", () => {
    expect(decodeIntent(undefined)).toBeNull();
    expect(decodeIntent("")).toBeNull();
    expect(decodeIntent("not-base64-$$$")).toBeNull();
  });

  it("rejects an unknown plan id (validated against the catalog)", () => {
    const tampered = encodeIntent({ ...intent, planId: "totally-made-up" });
    expect(decodeIntent(tampered)).toBeNull();
  });

  it("falls back to a safe profile and clamps numbers", () => {
    const raw = Buffer.from(
      JSON.stringify({ name: 1, planId: "plus", profile: "hacker", found: -5, remaining: "x" }),
      "utf8",
    ).toString("base64url");
    const decoded = decodeIntent(raw);
    expect(decoded).not.toBeNull();
    expect(decoded!.profile).toBe("personal");
    expect(decoded!.name).toBe("");
    expect(decoded!.found).toBe(0);
    expect(decoded!.remaining).toBe(0);
  });

  it("maps each profile onto the right onboarding subject type", () => {
    expect(profileToSubjectType("personal")).toBe("individual");
    expect(profileToSubjectType("reputation")).toBe("individual");
    expect(profileToSubjectType("executive")).toBe("executive");
    expect(profileToSubjectType("family")).toBe("family_member");
    expect(profileToSubjectType("business")).toBe("business");
  });
});
