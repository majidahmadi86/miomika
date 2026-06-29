export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerProfile } from "@/lib/auth/get-server-profile";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionItem } from "@/lib/billing/stripe-rest";
import { logError } from "@/lib/debug/log";

/**
 * GET /api/billing/status — live cancel state for the current subscriber, read
 * straight from Stripe (source of truth). Powers the "Pro Max — cancels on
 * [date]" line + the Resume button in /me. Free/guest always get a quiet
 * "not canceling" so the caller can render unconditionally.
 */
export async function GET() {
  const quiet = NextResponse.json({ canceling: false, periodEnd: null });
  if (!process.env.STRIPE_SECRET_KEY) return quiet;

  const profile = await getServerProfile();
  if (!profile) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (profile.tier === "free" || profile.tier === "guest") return quiet;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("stripe_subscription_id")
    .eq("id", profile.id)
    .single();
  const subscriptionId = (data?.stripe_subscription_id as string | null) ?? null;
  if (!subscriptionId) return quiet;

  try {
    const item = await getSubscriptionItem(subscriptionId);
    return NextResponse.json({
      canceling: item?.cancelAtPeriodEnd ?? false,
      periodEnd: item?.currentPeriodEnd ?? null,
    });
  } catch (e) {
    logError("billing", "status fetch failed", e);
    return quiet; // never block the page on a billing read
  }
}
