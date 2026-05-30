import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifyStripeSignature } from "@/lib/billing/webhook";

/**
 * POST /api/stripe/webhook — Stripe event sink.
 *
 * Verifies the signature with STRIPE_WEBHOOK_SECRET (no SDK), then upserts the
 * user's `subscriptions` row from subscription lifecycle events. The user id is
 * carried via client_reference_id / metadata.plan_id set at checkout. Uses the
 * service-role client (RLS bypassed) since there is no session on a webhook.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  const payload = await req.text();
  const sig = req.headers.get("stripe-signature");
  const result = verifyStripeSignature(payload, sig, secret);
  if (!result.valid) {
    return NextResponse.json({ error: `Invalid signature: ${result.reason}` }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Storage not configured." }, { status: 503 });
  }

  let event: { type: string; data: { object: Record<string, unknown> } };
  try {
    event = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "Bad payload." }, { status: 400 });
  }

  const obj = event.data?.object ?? {};
  const meta = (obj.metadata as Record<string, string> | undefined) ?? {};

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const userId = (obj.client_reference_id as string) || meta.user_id;
        if (userId) {
          await admin.from("subscriptions").upsert(
            {
              user_id: userId,
              plan_id: meta.plan_id ?? "unknown",
              status: "active",
              stripe_customer_id: (obj.customer as string) ?? null,
              stripe_subscription_id: (obj.subscription as string) ?? null,
            },
            { onConflict: "user_id" },
          );
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created":
      case "customer.subscription.deleted": {
        const status = event.type === "customer.subscription.deleted" ? "canceled" : (obj.status as string);
        const periodEnd = obj.current_period_end
          ? new Date((obj.current_period_end as number) * 1000).toISOString()
          : null;
        await admin
          .from("subscriptions")
          .update({
            status,
            plan_id: meta.plan_id ?? undefined,
            current_period_end: periodEnd,
            cancel_at_period_end: Boolean(obj.cancel_at_period_end),
          })
          .eq("stripe_subscription_id", obj.id as string);
        break;
      }
      default:
        break; // ignore unrelated events
    }
  } catch (err) {
    // Acknowledge to avoid retries storms; log for diagnosis.
    console.error("[privacyos] stripe webhook handling error:", err);
  }

  return NextResponse.json({ received: true });
}
