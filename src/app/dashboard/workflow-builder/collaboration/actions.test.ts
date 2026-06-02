import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  saveWorkflow: vi.fn(async () => {}),
  recordAudit: vi.fn(async () => {}),
  redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`); }),
}));

vi.mock("next/navigation", () => ({ redirect: h.redirect }));
vi.mock("../actions", () => ({ saveWorkflowAction: h.saveWorkflow }));
vi.mock("@/lib/audit/audit", () => ({ recordAudit: h.recordAudit }));

import { useCollaborationAction } from "./actions";

const form = (id: string) => {
  const fd = new FormData();
  if (id) fd.set("collaborationId", id);
  return fd;
};

beforeEach(() => { h.saveWorkflow.mockClear(); h.recordAudit.mockClear(); h.redirect.mockClear(); });

describe("useCollaborationAction", () => {
  it("lowers a known collaboration into a saved workflow and opens the builder", async () => {
    await expect(useCollaborationAction(form("deepfake-response")))
      .rejects.toThrow(/REDIRECT:\/dashboard\/workflow-builder\?from=generated/);
    expect(h.saveWorkflow).toHaveBeenCalledOnce();
    expect(h.recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "workflow.collaboration_used" }));
  });

  it("is a no-op for an unknown collaboration", async () => {
    await useCollaborationAction(form("nope"));
    expect(h.saveWorkflow).not.toHaveBeenCalled();
    expect(h.redirect).not.toHaveBeenCalled();
  });
});
