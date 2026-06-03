import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RemovalRequest } from "@/lib/types";

const h = vi.hoisted(() => ({
  removals: [] as RemovalRequest[],
  limit: Infinity as number,
  createRemoval: vi.fn(async (_b: string, _e?: string) => {}),
  recheckRemoval: vi.fn(async (_id: string) => {}),
  recordAudit: vi.fn(async () => {}),
  revalidate: vi.fn(),
  redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`); }),
}));

vi.mock("@/lib/data", () => ({
  getDataSource: async () => ({
    listRemovals: async () => h.removals,
    createRemoval: h.createRemoval,
    recheckRemoval: h.recheckRemoval,
  }),
}));
vi.mock("@/lib/billing/subscription", () => ({ getEntitlements: async () => ({ brokerRemovalLimit: h.limit }) }));
vi.mock("@/lib/audit/audit", () => ({ recordAudit: h.recordAudit }));
vi.mock("next/cache", () => ({ revalidatePath: h.revalidate }));
vi.mock("next/navigation", () => ({ redirect: h.redirect }));

import { fileRemovalAction, recheckRemovalAction } from "./actions";

const form = (entries: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
};
const removal = (status: RemovalRequest["status"]): RemovalRequest => ({
  id: Math.random().toString(36).slice(2), subjectId: "s1", brokerName: "X", status,
  submittedAt: "2026-01-01T00:00:00Z", history: [],
});

beforeEach(() => {
  h.removals = []; h.limit = Infinity;
  h.createRemoval.mockClear(); h.recheckRemoval.mockClear();
  h.recordAudit.mockClear(); h.revalidate.mockClear(); h.redirect.mockClear();
});

describe("fileRemovalAction", () => {
  it("files a removal and audits it when under the plan limit", async () => {
    h.limit = 10; h.removals = [removal("in_progress")];
    await fileRemovalAction(form({ brokerName: "Spokeo" }));
    expect(h.createRemoval).toHaveBeenCalledWith("Spokeo", undefined);
    expect(h.recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "removal.filed" }));
    expect(h.revalidate).toHaveBeenCalled();
  });

  it("blocks and redirects when the plan allowance is reached", async () => {
    h.limit = 1; h.removals = [removal("in_progress")];
    await expect(fileRemovalAction(form({ brokerName: "Whitepages" }))).rejects.toThrow(/REDIRECT:\/dashboard\/removals\?limit=1/);
    expect(h.createRemoval).not.toHaveBeenCalled();
    expect(h.recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "removal.limit_reached" }));
  });

  it("ignores an empty broker name", async () => {
    await fileRemovalAction(form({ brokerName: "   " }));
    expect(h.createRemoval).not.toHaveBeenCalled();
  });

  it("rechecks a removal by id", async () => {
    await recheckRemovalAction(form({ id: "r1" }));
    expect(h.recheckRemoval).toHaveBeenCalledWith("r1");
    expect(h.recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "removal.rechecked" }));
  });
});
