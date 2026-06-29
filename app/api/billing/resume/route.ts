export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerProfile } from "@/lib/auth/get-server-profile";
import { createClient } from "@/lib/supabase/server";
import { resumeSubscription } from "@/lib/billing/stripe-rest";
import { log, logError } from "@/lib/debug/log";

/**
 * POST /api/billing/resume — undo a pending cancellation (the in-app "Resume",
 * like Claude's). Clears cancel_at_period_end on the live Stripe subscription so
 * it keeps renewing. The subscription was never gone (canceling at period end =
 * still active), so there's no re-charge here — just a flag flip. The webhook
 * reconciles status afterward.
 */
export async function POST() {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Payments are not set up yet." }, { status: 503 });
  }
  const profile = await getServerProfile();
  if (!profile) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (profile.tier === "free" || profile.tier === "guest") {
    return NextResponse.json({ error: "No subscription to resume." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("stripe_subscription_id")
    .eq("id", profile.id)
    .single();
  const subscriptionId = (data?.stripe_subscription_id as string | null) ?? null;
  if (!subscriptionId) {
    return NextResponse.json(
      { error: "We couldn't find your subscription. Try Manage billing." },
      { status: 400 },
    );
  }

  try {
    await resumeSubscription(subscriptionId);
    log("billing", "resumed subscription", { userId: profile.id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    logError("billing", "resume failed", e);
    return NextResponse.json(
      { error: "We couldn't resume your subscription. Try Manage billing." },
      { status: 502 },
    );
  }
}
