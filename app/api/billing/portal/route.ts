export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerProfile } from "@/lib/auth/get-server-profile";
import { createClient } from "@/lib/supabase/server";
import { createBillingPortalSession } from "@/lib/billing/stripe-rest";
import { logError } from "@/lib/debug/log";

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Payments are not set up yet." }, { status: 503 });
  }

  const profile = await getServerProfile();
  if (!profile) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  // The customer id was linked on the first successful checkout (webhook).
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", profile.id)
    .single();

  const customerId = (data?.stripe_customer_id as string | null) ?? null;
  if (error || !customerId) {
    return NextResponse.json({ error: "No subscription to manage yet." }, { status: 400 });
  }

  // Origin-first so a stray NEXT_PUBLIC_APP_URL can't send them to the wrong domain.
  const base =
    req.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;

  try {
    const session = await createBillingPortalSession({
      customerId,
      returnUrl: `${base}/me`,
    });
    if (!session.url) {
      return NextResponse.json({ error: "Could not open billing portal." }, { status: 502 });
    }
    return NextResponse.json({ url: session.url });
  } catch (e) {
    logError("billing", "portal session error", e);
    return NextResponse.json({ error: "Could not open billing portal." }, { status: 502 });
  }
}
