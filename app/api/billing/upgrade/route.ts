export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerProfile } from "@/lib/auth/get-server-profile";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  getSubscriptionItem,
  changeSubscriptionPrice,
  priceIdFor,
  tierForPriceId,
} from "@/lib/billing/stripe-rest";
import { log, logError } from "@/lib/debug/log";

/**
 * POST /api/billing/upgrade — move an existing Pro subscriber to Pro Max in-app.
 *
 * We change the LIVE subscription's price (not a new checkout) so there's exactly
 * one subscription and no double-billing. Stripe charges the prorated difference
 * immediately; if that charge can't complete the change is rejected and nothing
 * happens (see changeSubscriptionPrice). On success we flip the tier with the
 * service client right away for an instant UI, and the subscription.updated
 * webhook reconciles the same value.
 */
export async function POST() {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Payments are not set up yet." }, { status: 503 });
  }

  const profile = await getServerProfile();
  if (!profile) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }
  // Only a current Pro can upgrade to Pro Max. (Free → use checkout; Pro Max already there.)
  if (profile.tier !== "pro") {
    return NextResponse.json({ error: "Nothing to upgrade." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("stripe_subscription_id")
    .eq("id", profile.id)
    .single();
  const subscriptionId = (data?.stripe_subscription_id as string | null) ?? null;
  if (error || !subscriptionId) {
    return NextResponse.json(
      { error: "We couldn't find your subscription. Try Manage billing." },
      { status: 400 },
    );
  }

  try {
    const item = await getSubscriptionItem(subscriptionId);
    if (!item) {
      return NextResponse.json(
        { error: "We couldn't read your subscription. Try Manage billing." },
        { status: 400 },
      );
    }
    // Keep the same billing interval they're already on (monthly stays monthly, etc.).
    const interval = item.interval ?? tierForPriceId(item.priceId)?.interval ?? "monthly";
    const proMaxPriceId = priceIdFor("pro_max", interval);
    if (!proMaxPriceId) {
      logError("billing", "no Pro Max price configured", { interval });
      return NextResponse.json({ error: "Pro Max isn't available right now." }, { status: 500 });
    }
    if (item.priceId === proMaxPriceId) {
      return NextResponse.json({ error: "You're already on Pro Max." }, { status: 400 });
    }

    await changeSubscriptionPrice({
      subscriptionId,
      itemId: item.itemId,
      newPriceId: proMaxPriceId,
    });

    // Charge succeeded → they are Pro Max now. Set it server-side (service client,
    // since RLS rightly forbids users changing their own tier). Webhook reconciles.
    const admin = await createServiceClient();
    await admin
      .from("profiles")
      .update({ tier: "pro_max", subscription_status: "active" })
      .eq("id", profile.id);

    log("billing", "upgraded pro → pro_max", { userId: profile.id, interval });
    return NextResponse.json({ ok: true });
  } catch (e) {
    logError("billing", "upgrade failed", e);
    return NextResponse.json(
      { error: "We couldn't complete the upgrade — your card may need attention. Try Manage billing." },
      { status: 502 },
    );
  }
}
