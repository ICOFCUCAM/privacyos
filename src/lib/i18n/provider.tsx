"use client";

import { createContext, useContext, useCallback } from "react";
import { translate } from "./dictionaries";
import { LOCALE_COOKIE, DEFAULT_LOCALE, type Locale } from "./config";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/** The translator bound to the active locale. */
export function useT(): (key: string, vars?: Record<string, string | number>) => string {
  const locale = useContext(LocaleContext);
  return useCallback((key, vars) => translate(locale, key, vars), [locale]);
}

/** Persist the chosen locale so the server reads it on the next render. */
export function persistLocale(locale: Locale): void {
  try {
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    /* non-browser / blocked — ignore */
  }
}
