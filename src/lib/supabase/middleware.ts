/**
 * Session-refresh + route-guard middleware helper.
 *
 * When Supabase is configured, refreshes the auth session on every request and
 * redirects unauthenticated users away from /dashboard to /login. When it is
 * NOT configured, it is a pass-through so the demo experience stays open.
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Expose the current path to server components (for plan-gating in the layout).
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  const nextOpts = { request: { headers: requestHeaders } };

  // Demo mode: no auth configured — let everything through.
  if (!url || !key) return NextResponse.next(nextOpts);

  let response = NextResponse.next(nextOpts);

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (
        toSet: { name: string; value: string; options?: Record<string, unknown> }[],
      ) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next(nextOpts);
        toSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options as never),
        );
      },
    },
  });

  let user;
  try {
    const res = await supabase.auth.getUser();
    user = res.data.user;
  } catch (err) {
    // Auth backend unreachable / misconfigured — don't 500 the whole app. Let
    // the request through; page-level data access degrades to demo data.
    console.error("[privacyos] middleware auth check failed:", err);
    return response;
  }

  const path = request.nextUrl.pathname;
  if (!user && (path.startsWith("/dashboard") || path.startsWith("/onboarding"))) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/login";
    redirect.searchParams.set("next", path);
    return NextResponse.redirect(redirect);
  }

  return response;
}
