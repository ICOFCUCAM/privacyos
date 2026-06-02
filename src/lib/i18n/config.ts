/**
 * i18n configuration — the locale catalog + cookie contract.
 *
 * Dependency-free, matching the rest of the platform (Stripe REST, LLM
 * provider): a small typed locale list, a cookie that persists the choice
 * (read on the server to set <html lang> and seed the client provider), and
 * coercion helpers. Pure + unit-tested.
 */

export type Locale = "en" | "fr" | "es" | "de";

export interface LocaleMeta {
  code: Locale;
  label: string;
  /** Native name, shown in the switcher. */
  native: string;
  flag: string;
}

export const LOCALES: LocaleMeta[] = [
  { code: "en", label: "English", native: "English", flag: "🇬🇧" },
  { code: "fr", label: "French", native: "Français", flag: "🇫🇷" },
  { code: "es", label: "Spanish", native: "Español", flag: "🇪🇸" },
  { code: "de", label: "German", native: "Deutsch", flag: "🇩🇪" },
];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "po_locale";

const CODES = new Set(LOCALES.map((l) => l.code));

export function isLocale(value: string | null | undefined): value is Locale {
  return !!value && CODES.has(value as Locale);
}

/** Coerce an untrusted value (cookie/header) to a supported locale. */
export function coerceLocale(value: string | null | undefined): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function localeMeta(code: Locale): LocaleMeta {
  return LOCALES.find((l) => l.code === code) ?? LOCALES[0];
}
