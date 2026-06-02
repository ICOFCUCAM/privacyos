import { NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
import { PLANS } from "@/lib/billing/plans";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createCheckoutSession, isPlanPurchasable, stripePriceId } from "@/lib/billing/stripe";
import { resolveStart } from "@/lib/home/start-flow";
import { decodeIntent, INTENT_COOKIE } from "@/lib/home/scan-intent";

async function origin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * GET /start?plan=<id> — the single activation door.
 *
 * One link carries the visitor from the free scan's recommendation across the
 * auth boundary and straight into checkout (or onboarding for the free tier),
 * so they never re-pick a plan or hunt for the page again. Falls back to the
 * scan-intent cookie's plan when none is supplied. Decisions are made by the
 * pure `resolveStart`; this handler just executes them.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const store = await cookies();
  const intent = decodeIntent(store.get(INTENT_COOKIE)?.value);
  const planId = url.searchParams.get("plan") || intent?.planId || "";
  const plan = PLANS.find((p) => p.id === planId);

  const supabaseConfigured = isSupabaseConfigured();
  let authed = false;
  if (supabaseConfigured) {
    const supabase = await getSupabaseServerClient();
    const { data } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
    authed = Boolean(data?.user);
  }

  const base = await origin();
  const action = resolveStart({
    supabaseConfigured,
    authed,
    planId,
    planMonthly: plan ? plan.monthly : undefined,
    purchasable: plan ? isPlanPurchasable(plan.id) : false,
  });

  switch (action.kind) {
    case "login":
      return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(action.next)}`, base));
    case "dashboard":
      return NextResponse.redirect(new URL("/dashboard/home", base));
    case "pricing":
      return NextResponse.redirect(new URL("/pricing", base));
    case "onboarding":
      return NextResponse.redirect(new URL("/onboarding", base));
    case "checkout": {
      // Resume the recommended plan's checkout automatically — annual by default
      // (best price). On any failure, fall back to onboarding so we never dead-end.
      try {
        const supabase = await getSupabaseServerClient();
        const { data } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
        const user = data?.user;
        const priceId = plan ? stripePriceId(plan.id, true) : undefined;
        if (user && plan && priceId) {
          const checkoutUrl = await createCheckoutSession({
            priceId,
            planId: plan.id,
            annual: true,
            // Land in onboarding after payment so the subject is created and the
            // now-entitled protection packs get provisioned.
            successUrl: `${base}/onboarding`,
            cancelUrl: `${base}/pricing?plan=${plan.id}`,
            customerEmail: user.email ?? undefined,
            clientReferenceId: user.id,
          });
          return NextResponse.redirect(checkoutUrl);
        }
      } catch {
        /* fall through */
      }
      return NextResponse.redirect(new URL("/onboarding", base));
    }
  }
}
