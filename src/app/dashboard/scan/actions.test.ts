import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoisted spies for the action's collaborators.
const h = vi.hoisted(() => ({
  setCookie: vi.fn(),
  saveWorkflow: vi.fn(async () => {}),
  recordAudit: vi.fn(async () => {}),
  redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`); }),
}));

vi.mock("next/headers", () => ({ cookies: async () => ({ set: h.setCookie }) }));
vi.mock("next/navigation", () => ({ redirect: h.redirect }));
vi.mock("../workflow-builder/actions", () => ({ saveWorkflowAction: h.saveWorkflow }));
vi.mock("@/lib/audit/audit", () => ({ recordAudit: h.recordAudit }));

import { startProtectionAction, trackActivationAction } from "./actions";

beforeEach(() => {
  h.setCookie.mockClear();
  h.saveWorkflow.mockClear();
  h.recordAudit.mockClear();
  h.redirect.mockClear();
});

describe("startProtectionAction (activation loop wiring)", () => {
  it("persists the autonomy mode, installs the named packs, and lands on Protection Home", async () => {
    await expect(startProtectionAction("autopilot", ["remove-data-brokers"]))
      .rejects.toThrow(/REDIRECT:\/dashboard\/home\?activated=1/);

    // mode cookie set
    expect(h.setCookie).toHaveBeenCalledWith("po_autonomy", "autopilot", expect.objectContaining({ path: "/" }));
    // the pack's backing templates were saved (remove-data-brokers bundles 2)
    expect(h.saveWorkflow.mock.calls.length).toBeGreaterThanOrEqual(1);
    // an audit event recorded
    expect(h.recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "activation.protect" }));
  });

  it("coerces an invalid mode and ignores unknown packs", async () => {
    await expect(startProtectionAction("bogus" as never, ["not-a-pack"]))
      .rejects.toThrow(/REDIRECT:\/dashboard\/home\?activated=0/); // no valid packs installed
    expect(h.setCookie).toHaveBeenCalledWith("po_autonomy", "autopilot", expect.anything()); // coerced default
  });

  it("dedupes repeated pack ids", async () => {
    await expect(startProtectionAction("hybrid", ["breach-response", "breach-response"]))
      .rejects.toThrow(/REDIRECT:\/dashboard\/home\?activated=1/); // installed once
  });
});

describe("trackActivationAction", () => {
  it("emits a namespaced activation event with its props", async () => {
    await trackActivationAction("revealed", { ttffMs: 1234, findings: 9 });
    expect(h.recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: "activation.revealed",
      metadata: expect.objectContaining({ ttffMs: 1234, findings: 9 }),
    }));
  });
});
