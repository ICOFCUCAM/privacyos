/**
 * i18n configuration — the locale catalog + cookie contract.
 *
 * Dependency-free, matching the rest of the platform (Stripe REST, LLM
 * provider): a small typed locale list, a cookie that persists the choice
 * (read on the server to set <html lang> and seed the client provider), and
 * coercion helpers. Pure + unit-tested.
 */

export type Locale = "en" | "fr" | "es" | "de" | "no" | "ja";

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
  { code: "no", label: "Norwegian", native: "Norsk", flag: "🇳🇴" },
  { code: "ja", label: "Japanese", native: "日本語", flag: "🇯🇵" },
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

/**
 * Pick the best supported locale from an `Accept-Language` header, e.g.
 * "fr-FR,fr;q=0.9,en;q=0.8" → "fr". Returns null if none match (caller then
 * uses the default). Relies on the browser's own preference ordering.
 */
export function pickFromAcceptLanguage(header: string | null | undefined): Locale | null {
  if (!header) return null;
  for (const part of header.split(",")) {
    const tag = part.trim().split(";")[0].toLowerCase().split("-")[0];
    if (isLocale(tag)) return tag;
  }
  return null;
}
