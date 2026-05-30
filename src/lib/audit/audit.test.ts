import { describe, expect, it } from "vitest";
import { demoAuditLog, describeAudit } from "./audit";

describe("audit", () => {
  it("provides human-readable labels for known actions", () => {
    expect(describeAudit({ id: "1", actor: "user", action: "removal.filed", metadata: {}, createdAt: "" })).toBe("Filed data-broker opt-out");
  });

  it("falls back to a readable form for unknown actions", () => {
    expect(describeAudit({ id: "1", actor: "user", action: "custom.thing_happened", metadata: {}, createdAt: "" })).toBe("custom thing happened");
  });

  it("demo log includes both user and agent actors", () => {
    const log = demoAuditLog();
    expect(log.some((e) => e.actor === "user")).toBe(true);
    expect(log.some((e) => e.actor.startsWith("agent"))).toBe(true);
  });
});
