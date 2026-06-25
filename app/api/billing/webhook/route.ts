export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyStripeEvent, tierForPriceId } from "@/lib/billing/stripe-rest";
import { log, logError } from "@/lib/debug/log";

// Minimal shape of the Stripe objects we read — enough to stay off `any`.
type StripeObject = {
  id?: string;
  metadata?: Record<string, string> | null;
  client_reference_id?: string | null;
  customer?: string | null;
  subscription?: string | null;
  status?: string;
  current_period_end?: number;
  items?: { data?: Array<{ price?: { id?: string } }> };
};
type StripeEvent = { type?: string; data?: { object?: StripeObject } };

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    log("billing", "STRIPE_WEBHOOK_SECRET missing — webhook disabled");
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event: StripeEvent;
  try {
    event = verifyStripeEvent(rawBody, signature, webhookSecret) as StripeEvent;
  } catch (e) {
    logError("billing", "webhook signature rejected", e);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const type = event.type ?? "";
  const obj: StripeObject = event.data?.object ?? {};

  try {
    const supabase = await createServiceClient();

    if (type === "checkout.session.completed") {
      // The customer just paid. Link Stripe ids and grant the tier they bought.
      const userId = obj.metadata?.user_id ?? obj.client_reference_id ?? null;
      const plan = obj.metadata?.plan;
      if (userId && (plan === "pro" || plan === "pro_max")) {
        await supabase
          .from("profiles")
          .update({
            tier: plan,
            stripe_customer_id: obj.customer ?? null,
            stripe_subscription_id: obj.subscription ?? null,
            subscription_status: "active",
          })
          .eq("id", userId);
        log("billing", `granted ${plan} to ${userId}`);
      }
    } else if (type === "customer.subscription.created" || type === "customer.subscription.updated") {
      // Renewals, plan changes, lapses. Tier follows the live price + status.
      const userId = obj.metadata?.user_id ?? null;
      const status = obj.status ?? "";
      const priceId = obj.items?.data?.[0]?.price?.id;
      const mapped = priceId ? tierForPriceId(priceId) : null;
      const active = status === "active" || status === "trialing";
      const periodEnd =
        typeof obj.current_period_end === "number"
          ? new Date(obj.current_period_end * 1000).toISOString()
          : null;
      if (userId) {
        await supabase
          .from("profiles")
          .update({
            tier: active && mapped ? mapped.tier : "free",
            subscription_status: status,
            stripe_subscription_id: obj.id ?? null,
            plan_interval: mapped?.interval ?? null,
            current_period_end: periodEnd,
          })
          .eq("id", userId);
      }
    } else if (type === "customer.subscription.deleted") {
      // Subscription ended for good. Back to free.
      const userId = obj.metadata?.user_id ?? null;
      if (userId) {
        await supabase
          .from("profiles")
          .update({ tier: "free", subscription_status: "canceled" })
          .eq("id", userId);
        log("billing", `reverted ${userId} to free`);
      }
    }
  } catch (e) {
    // Return 500 so Stripe retries — the event was authentic but we failed to apply it.
    logError("billing", "webhook handler error", e);
    return NextResponse.json({ error: "handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
