import { cookies, headers } from "next/headers";
import { isLocale, pickFromAcceptLanguage, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from "./config";
import { translate } from "./dictionaries";

/**
 * Active locale: an explicit cookie choice wins; otherwise honour the browser's
 * `Accept-Language` header; otherwise the default.
 */
export async function getLocale(): Promise<Locale> {
  const cookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(cookie)) return cookie;
  const accept = (await headers()).get("accept-language");
  return pickFromAcceptLanguage(accept) ?? DEFAULT_LOCALE;
}

/** A server-side translator bound to the request's locale. */
export async function getT(): Promise<(key: string, vars?: Record<string, string | number>) => string> {
  const locale = await getLocale();
  return (key, vars) => translate(locale, key, vars);
}
