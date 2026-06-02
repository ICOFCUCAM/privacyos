import { afterEach, describe, expect, it, vi } from "vitest";
import { isStripeConfigured, stripePriceId } from "./stripe";

describe("stripe helpers", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("reports configured only when the secret key is set", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    expect(isStripeConfigured()).toBe(false);
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123");
    expect(isStripeConfigured()).toBe(true);
  });

  it("derives the env var name from the plan id", () => {
    vi.stubEnv("STRIPE_PRICE_PLUS", "price_plus");
    vi.stubEnv("STRIPE_PRICE_REP_CREATOR", "price_creator");
    expect(stripePriceId("plus")).toBe("price_plus");
    expect(stripePriceId("rep-creator")).toBe("price_creator");
    expect(stripePriceId("unmapped")).toBeUndefined();
  });

  it("prefers the annual price when requested, else falls back to monthly", () => {
    vi.stubEnv("STRIPE_PRICE_PLUS", "price_plus_monthly");
    vi.stubEnv("STRIPE_PRICE_PLUS_ANNUAL", "price_plus_annual");
    vi.stubEnv("STRIPE_PRICE_PREMIUM", "price_premium_monthly"); // no annual configured

    expect(stripePriceId("plus", true)).toBe("price_plus_annual");
    expect(stripePriceId("plus", false)).toBe("price_plus_monthly");
    // annual requested but unconfigured → falls back to the monthly price
    expect(stripePriceId("premium", true)).toBe("price_premium_monthly");
    // still undefined when the plan is unmapped entirely
    expect(stripePriceId("unmapped", true)).toBeUndefined();
  });
});
