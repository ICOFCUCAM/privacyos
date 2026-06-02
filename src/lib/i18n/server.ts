import { cookies } from "next/headers";
import { coerceLocale, LOCALE_COOKIE, type Locale } from "./config";
import { translate } from "./dictionaries";

/** Read the active locale from the cookie (server components / layouts). */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  return coerceLocale(store.get(LOCALE_COOKIE)?.value);
}

/** A server-side translator bound to the request's locale. */
export async function getT(): Promise<(key: string, vars?: Record<string, string | number>) => string> {
  const locale = await getLocale();
  return (key, vars) => translate(locale, key, vars);
}
