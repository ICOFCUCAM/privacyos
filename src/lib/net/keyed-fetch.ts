/**
 * Shared HTTP helper for the keyed API connectors (SERP, Hunter, podcasts,
 * property data). Wraps the abort-timeout + non-2xx-throws + JSON-parse pattern
 * each connector repeated, so they keep only their own key-guard, mapping and
 * graceful fallback. Fetch is injectable for tests.
 */

export interface FetchJsonOptions {
  init?: RequestInit;
  /** Abort after this many ms (default 6000). */
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  /** Prefix for the thrown error on a non-2xx response (e.g. provider name). */
  label?: string;
}

/** Fetch and parse JSON with an abort timeout; throws on network error or non-2xx. */
export async function fetchJsonWithTimeout<T>(url: string, opts: FetchJsonOptions = {}): Promise<T> {
  const { init, timeoutMs = 6000, fetchImpl = fetch, label = "HTTP" } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { ...init, signal: controller.signal });
    if (!res.ok) throw new Error(`${label} ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}
