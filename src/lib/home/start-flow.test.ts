import { describe, it, expect } from "vitest";
import { resolveStart } from "./start-flow";

const base = { supabaseConfigured: true, authed: true, planId: "plus", planMonthly: 29.99, purchasable: true };

describe("resolveStart — the single activation door", () => {
  it("sends a signed-in customer with a wired paid plan straight to checkout", () => {
    expect(resolveStart(base).kind).toBe("checkout");
  });

  it("bounces a logged-out visitor through login, remembering the plan to resume", () => {
    const action = resolveStart({ ...base, authed: false });
    expect(action).toEqual({ kind: "login", next: "/start?plan=plus" });
  });

  it("onboards (captures the lead) when a paid plan isn't wired to Stripe yet", () => {
    expect(resolveStart({ ...base, purchasable: false }).kind).toBe("onboarding");
  });

  it("onboards the free tier rather than attempting checkout", () => {
    expect(resolveStart({ ...base, planId: "free", planMonthly: 0, purchasable: false }).kind).toBe("onboarding");
  });

  it("shows the product in demo mode (no backend to buy or onboard against)", () => {
    expect(resolveStart({ ...base, supabaseConfigured: false }).kind).toBe("dashboard");
    expect(resolveStart({ ...base, supabaseConfigured: false, planMonthly: undefined }).kind).toBe("pricing");
  });

  it("falls back to pricing for an unknown plan", () => {
    expect(resolveStart({ ...base, planId: "", planMonthly: undefined }).kind).toBe("pricing");
    expect(resolveStart({ ...base, authed: false, planId: "", planMonthly: undefined })).toEqual({
      kind: "login",
      next: "/pricing",
    });
  });
});
