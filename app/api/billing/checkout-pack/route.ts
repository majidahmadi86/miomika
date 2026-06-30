export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerProfile } from "@/lib/auth/get-server-profile";
import { createPackCheckoutSession, packPriceId } from "@/lib/billing/stripe-rest";
import { resolveReferralDiscount } from "@/lib/billing/referral-discount";
import { ROOM_PACKS } from "@/lib/billing/tiers";
import { log, logError } from "@/lib/debug/log";

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Payments are not set up yet." }, { status: 503 });
  }

  const profile = await getServerProfile();
  if (!profile) {
    return NextResponse.json({ error: "Please sign in to buy a room pack." }, { status: 401 });
  }

  let body: { count?: number };
  try {
    body = (await req.json()) as { count?: number };
  } catch {
    body = {};
  }

  const count = Number(body.count);
  const valid = ROOM_PACKS.some((p) => p.count === count);
  if (!valid) {
    return NextResponse.json({ error: "Unknown pack." }, { status: 400 });
  }

  const priceId = packPriceId(count);
  if (!priceId) {
    log("billing", `no Stripe price configured for room pack ${count}`);
    return NextResponse.json({ error: "Payments are not set up yet." }, { status: 503 });
  }

  // Return users to where they are (origin), not a stray NEXT_PUBLIC_APP_URL.
  const base =
    req.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;

  try {
    const priceBaht = ROOM_PACKS.find((p) => p.count === count)?.priceTHB ?? 0;
    const discount = priceBaht > 0 ? await resolveReferralDiscount(profile.id, priceBaht) : null;

    const session = await createPackCheckoutSession({
      priceId,
      count,
      customerEmail: profile.email,
      userId: profile.id,
      successUrl: `${base}/learn?pack=${count}`,
      cancelUrl: `${base}/learn`,
      discount,
    });
    if (!session.url) {
      return NextResponse.json({ error: "Could not start checkout." }, { status: 502 });
    }
    return NextResponse.json({ url: session.url });
  } catch (e) {
    logError("billing", "pack checkout session error", e);
    return NextResponse.json({ error: "Could not start checkout." }, { status: 502 });
  }
}
