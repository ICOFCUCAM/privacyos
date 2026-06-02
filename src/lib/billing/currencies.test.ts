import { describe, it, expect } from "vitest";
import {
  CURRENCIES, findCurrency, isSupportedCurrency, resolveCurrency,
  toStripeAmount, displayAmount, formatMoney, DEFAULT_CURRENCY,
} from "./currencies";

describe("presentment currencies", () => {
  it("offers at least 10 distinct ISO currencies incl. the requested ones", () => {
    expect(CURRENCIES.length).toBeGreaterThanOrEqual(10);
    const codes = new Set(CURRENCIES.map((c) => c.code));
    for (const want of ["usd", "gbp", "cad", "nok", "eur"]) expect(codes.has(want)).toBe(true);
    expect(codes.size).toBe(CURRENCIES.length); // unique
    // all lower-case ISO codes (Stripe format)
    for (const c of CURRENCIES) expect(c.code).toMatch(/^[a-z]{3}$/);
  });

  it("resolves + validates currency codes, defaulting to USD", () => {
    expect(findCurrency("GBP")?.code).toBe("gbp"); // case-insensitive
    expect(isSupportedCurrency("nok")).toBe(true);
    expect(isSupportedCurrency("frf")).toBe(false); // obsolete French franc — unsupported
    expect(resolveCurrency("zzz").code).toBe(DEFAULT_CURRENCY);
    expect(resolveCurrency(null).code).toBe("usd");
  });

  it("converts USD to Stripe minor units, handling zero-decimal currencies", () => {
    const usd = findCurrency("usd")!;
    expect(toStripeAmount(29.99, usd)).toBe(2999); // dollars → cents
    const jpy = findCurrency("jpy")!;
    // zero-decimal: unit_amount is the whole number (no ×100)
    expect(toStripeAmount(30, jpy)).toBe(Math.round(30 * jpy.rate));
  });

  it("formats localized prices with the right symbol + placement", () => {
    expect(formatMoney(30, findCurrency("usd")!)).toBe("$30");
    expect(formatMoney(30, findCurrency("gbp")!)).toMatch(/^£/);
    expect(formatMoney(30, findCurrency("nok")!)).toMatch(/kr$/); // trailing for krone
    expect(displayAmount(30, findCurrency("jpy")!) % 1).toBe(0); // whole yen
  });
});
