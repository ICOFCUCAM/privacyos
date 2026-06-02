import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  saveWorkflow: vi.fn(async (_def: { id: string; steps: unknown[] }) => {}),
  redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`); }),
}));

vi.mock("next/navigation", () => ({ redirect: h.redirect }));
vi.mock("../workflow-builder/actions", () => ({ saveWorkflowAction: h.saveWorkflow }));

import { useTemplateAction } from "./actions";

const form = (id: string) => {
  const fd = new FormData();
  if (id) fd.set("templateId", id);
  return fd;
};

beforeEach(() => { h.saveWorkflow.mockClear(); h.redirect.mockClear(); });

describe("useTemplateAction", () => {
  it("instantiates a known template into a saved draft and opens the builder", async () => {
    await expect(useTemplateAction(form("breach-response")))
      .rejects.toThrow(/REDIRECT:\/dashboard\/workflow-builder\?from=template/);
    expect(h.saveWorkflow).toHaveBeenCalledOnce();
    const def = h.saveWorkflow.mock.calls[0][0];
    expect(def.id).toBe("draft");
    expect(def.steps.length).toBeGreaterThan(0);
  });

  it("is a no-op for an unknown template id", async () => {
    await useTemplateAction(form("nope"));
    expect(h.saveWorkflow).not.toHaveBeenCalled();
    expect(h.redirect).not.toHaveBeenCalled();
  });
});
