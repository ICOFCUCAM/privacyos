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
});
