import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { logError } from "@/lib/debug/log";

const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/,
  /^android\.googleapis\.com$/,
  /^updates\.push\.services\.mozilla\.com$/,
  /(^|\.)push\.services\.mozilla\.com$/,
  /(^|\.)notify\.windows\.com$/,
  /^web\.push\.apple\.com$/,
];

function isPushServiceEndpoint(endpoint: string): boolean {
  try {
    const u = new URL(endpoint);
    return u.protocol === "https:" && PUSH_HOSTS.some((re) => re.test(u.hostname));
  } catch {
    return false;
  }
}

/**
 * Save or remove the browser's push subscription for the signed-in user.
 * POST body: the PushSubscription JSON ({ endpoint, keys: { p256dh, auth } }).
 * DELETE body: { endpoint }.
 *
 * Auth happens with the user's own session; the write uses the service
 * client because push_subscriptions is RLS-locked with no policies.
 */

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const endpoint = body?.endpoint;
  const p256dh = body?.keys?.p256dh;
  const auth = body?.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  // The care cron later POSTs to this URL, so only accept real push services.
  if (!isPushServiceEndpoint(endpoint)) {
    return NextResponse.json({ error: "invalid endpoint" }, { status: 400 });
  }

  const admin = await createServiceClient();
  const { error } = await admin
    .from("push_subscriptions")
    .upsert(
      { user_id: user.id, endpoint, p256dh, auth },
      { onConflict: "endpoint" },
    );
  if (error) {
    logError("push/subscribe", "upsert failed", error);
    return NextResponse.json({ error: "save failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { endpoint?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  if (!body?.endpoint) {
    return NextResponse.json({ error: "missing endpoint" }, { status: 400 });
  }

  const admin = await createServiceClient();
  await admin
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", body.endpoint)
    .eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
