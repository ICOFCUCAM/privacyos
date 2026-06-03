/**
 * Presentment currencies for checkout.
 *
 * PrivacyOS is multinational: customers pick their currency before paying. Each
 * Stripe Price carries `currency_options` for every currency here (provisioned
 * by scripts/stripe-setup.ts), and the Checkout Session is opened in the chosen
 * one. The `rate` values are approximate USD→currency multipliers used only to
 * (a) display localized prices on the pricing page and (b) seed the
 * currency_options amounts — a real business sets bespoke local prices, but a
 * single base + rate table is an honest, consistent default. Pure + unit-tested.
 */

export interface Currency {
  /** ISO-4217, lower-case (Stripe's format). */
  code: string;
  label: string;
  symbol: string;
  flag: string;
  /** Approximate USD → this-currency multiplier. */
  rate: number;
  /** Currencies with no minor unit (e.g. JPY) — amount is the whole number. */
  zeroDecimal?: boolean;
}

export const CURRENCIES: Currency[] = [
  { code: "usd", label: "US Dollar", symbol: "$", flag: "🇺🇸", rate: 1 },
  { code: "eur", label: "Euro", symbol: "€", flag: "🇪🇺", rate: 0.92 },
  { code: "gbp", label: "British Pound", symbol: "£", flag: "🇬🇧", rate: 0.79 },
  { code: "cad", label: "Canadian Dollar", symbol: "CA$", flag: "🇨🇦", rate: 1.36 },
  { code: "aud", label: "Australian Dollar", symbol: "A$", flag: "🇦🇺", rate: 1.52 },
  { code: "nok", label: "Norwegian Krone", symbol: "kr", flag: "🇳🇴", rate: 10.7 },
  { code: "sek", label: "Swedish Krona", symbol: "kr", flag: "🇸🇪", rate: 10.5 },
  { code: "dkk", label: "Danish Krone", symbol: "kr", flag: "🇩🇰", rate: 6.9 },
  { code: "chf", label: "Swiss Franc", symbol: "CHF", flag: "🇨🇭", rate: 0.88 },
  { code: "jpy", label: "Japanese Yen", symbol: "¥", flag: "🇯🇵", rate: 157, zeroDecimal: true },
  { code: "sgd", label: "Singapore Dollar", symbol: "S$", flag: "🇸🇬", rate: 1.34 },
  { code: "inr", label: "Indian Rupee", symbol: "₹", flag: "🇮🇳", rate: 83 },
];

export const DEFAULT_CURRENCY = "usd";

const BY_CODE = new Map(CURRENCIES.map((c) => [c.code, c]));

export function findCurrency(code: string | null | undefined): Currency | undefined {
  return code ? BY_CODE.get(code.toLowerCase()) : undefined;
}

export function isSupportedCurrency(code: string | null | undefined): boolean {
  return !!findCurrency(code);
}

/** Resolve to a supported currency, falling back to USD. */
export function resolveCurrency(code: string | null | undefined): Currency {
  return findCurrency(code) ?? BY_CODE.get(DEFAULT_CURRENCY)!;
}

/**
 * Convert a USD amount (in dollars) to the target currency's Stripe minor unit
 * (`unit_amount`): cents for normal currencies, whole units for zero-decimal.
 */
export function toStripeAmount(usdDollars: number, c: Currency): number {
  const major = usdDollars * c.rate;
  return c.zeroDecimal ? Math.round(major) : Math.round(major * 100);
}

/** The display amount (major unit) for a USD price in the target currency. */
export function displayAmount(usdDollars: number, c: Currency): number {
  const major = usdDollars * c.rate;
  return c.zeroDecimal ? Math.round(major) : Math.round(major * 100) / 100;
}

/** Format a USD price for display in the target currency, e.g. "£23", "¥4,710". */
export function formatMoney(usdDollars: number, c: Currency): string {
  const amount = displayAmount(usdDollars, c);
  const n = amount % 1 === 0 ? amount.toLocaleString() : amount.toFixed(2);
  // Krone/Krona read better with a trailing symbol; most read better leading.
  return c.code === "nok" || c.code === "sek" || c.code === "dkk" ? `${n} ${c.symbol}` : `${c.symbol}${n}`;
}
