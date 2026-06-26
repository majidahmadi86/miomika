export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerProfile } from "@/lib/auth/get-server-profile";
import { createCheckoutSession, priceIdFor, type BillingPlan, type BillingInterval } from "@/lib/billing/stripe-rest";
import { log, logError } from "@/lib/debug/log";

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Payments are not set up yet." }, { status: 503 });
  }

  const profile = await getServerProfile();
  if (!profile) {
    return NextResponse.json({ error: "Please sign in to upgrade." }, { status: 401 });
  }

  let body: { plan?: string; interval?: string };
  try {
    body = (await req.json()) as { plan?: string; interval?: string };
  } catch {
    body = {};
  }

  const plan = body.plan;
  if (plan !== "pro" && plan !== "pro_max") {
    return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
  }
  const interval: BillingInterval = body.interval === "yearly" ? "yearly" : "monthly";

  const priceId = priceIdFor(plan as BillingPlan, interval);
  if (!priceId) {
    log("billing", `no Stripe price configured for ${plan}/${interval}`);
    return NextResponse.json({ error: "Payments are not set up yet." }, { status: 503 });
  }

  // Send users back to where they actually are (origin), so a stray
  // NEXT_PUBLIC_APP_URL can't redirect them to localhost or the wrong domain.
  const base =
    req.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;

  try {
    const session = await createCheckoutSession({
      priceId,
      customerEmail: profile.email,
      userId: profile.id,
      plan: plan as BillingPlan,
      interval,
      successUrl: `${base}/learn?upgraded=1`,
      cancelUrl: `${base}/learn`,
    });
    if (!session.url) {
      return NextResponse.json({ error: "Could not start checkout." }, { status: 502 });
    }
    return NextResponse.json({ url: session.url });
  } catch (e) {
    logError("billing", "checkout session error", e);
    return NextResponse.json({ error: "Could not start checkout." }, { status: 502 });
  }
}
