import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  saveWorkflow: vi.fn(async () => {}),
  recordAudit: vi.fn(async () => {}),
  redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`); }),
}));

vi.mock("next/navigation", () => ({ redirect: h.redirect }));
vi.mock("../actions", () => ({ saveWorkflowAction: h.saveWorkflow }));
vi.mock("@/lib/audit/audit", () => ({ recordAudit: h.recordAudit }));

import { installListingAction } from "./actions";

const form = (listingId: string) => {
  const fd = new FormData();
  if (listingId) fd.set("listingId", listingId);
  return fd;
};

beforeEach(() => {
  h.saveWorkflow.mockClear();
  h.recordAudit.mockClear();
  h.redirect.mockClear();
});

describe("installListingAction", () => {
  it("installs a known pack's workflows and lands in the builder", async () => {
    await expect(installListingAction(form("protect-my-ceo")))
      .rejects.toThrow(/REDIRECT:\/dashboard\/workflow-builder\?from=marketplace/);
    expect(h.saveWorkflow.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(h.recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "workflow.installed" }));
  });

  it("is a no-op for an unknown listing (no saves, no redirect)", async () => {
    await installListingAction(form("not-a-listing"));
    expect(h.saveWorkflow).not.toHaveBeenCalled();
    expect(h.redirect).not.toHaveBeenCalled();
  });
});
