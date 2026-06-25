// SERVER ONLY. Never import in a client component.
// Talks to Stripe over its REST API (no SDK dependency) and verifies webhook
// signatures with Node crypto per Stripe's documented algorithm.

import { createHmac, timingSafeEqual } from "crypto";

const STRIPE_API = "https://api.stripe.com/v1";

export type BillingPlan = "pro" | "pro_max";
export type BillingInterval = "monthly" | "yearly";

function secretKey(): string {
  const k = process.env.STRIPE_SECRET_KEY;
  if (!k) throw new Error("STRIPE_SECRET_KEY missing");
  return k;
}

/** plan + interval -> Stripe price id, read from env (set by Mike per the locked pricing). */
export function priceIdFor(plan: BillingPlan, interval: BillingInterval): string | null {
  const key = `STRIPE_PRICE_${plan.toUpperCase()}_${interval.toUpperCase()}`;
  return process.env[key] ?? null;
}

/** Reverse lookup: a Stripe price id -> which tier/interval it grants. Built from the same env. */
export function tierForPriceId(priceId: string): { tier: BillingPlan; interval: BillingInterval } | null {
  const entries: Array<[string | undefined, BillingPlan, BillingInterval]> = [
    [process.env.STRIPE_PRICE_PRO_MONTHLY, "pro", "monthly"],
    [process.env.STRIPE_PRICE_PRO_YEARLY, "pro", "yearly"],
    [process.env.STRIPE_PRICE_PRO_MAX_MONTHLY, "pro_max", "monthly"],
    [process.env.STRIPE_PRICE_PRO_MAX_YEARLY, "pro_max", "yearly"],
  ];
  for (const [envPrice, tier, interval] of entries) {
    if (envPrice && envPrice === priceId) return { tier, interval };
  }
  return null;
}

/** Create a Stripe Checkout Session (subscription mode) and return its hosted URL. */
export async function createCheckoutSession(params: {
  priceId: string;
  customerEmail: string | null;
  userId: string;
  plan: BillingPlan;
  interval: BillingInterval;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ id: string; url: string | null }> {
  const form = new URLSearchParams();
  form.set("mode", "subscription");
  form.set("line_items[0][price]", params.priceId);
  form.set("line_items[0][quantity]", "1");
  form.set("success_url", params.successUrl);
  form.set("cancel_url", params.cancelUrl);
  form.set("client_reference_id", params.userId);
  if (params.customerEmail) form.set("customer_email", params.customerEmail);
  form.set("allow_promotion_codes", "true");
  // Carried back to us on the session + the subscription so the webhook knows who paid.
  form.set("metadata[user_id]", params.userId);
  form.set("metadata[plan]", params.plan);
  form.set("metadata[interval]", params.interval);
  form.set("subscription_data[metadata][user_id]", params.userId);
  form.set("subscription_data[metadata][plan]", params.plan);

  const res = await fetch(`${STRIPE_API}/checkout/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Stripe checkout failed (${res.status}): ${detail}`);
  }
  const json = (await res.json()) as { id: string; url: string | null };
  return { id: json.id, url: json.url };
}

/**
 * Verify a Stripe webhook signature and return the parsed event.
 * Implements Stripe's documented scheme: signed_payload = `${t}.${rawBody}`,
 * HMAC-SHA256 with the endpoint secret, constant-time compared against each v1
 * signature, with a timestamp tolerance to blunt replay attacks. Throws on any
 * failure so the caller can return 400.
 */
export function verifyStripeEvent(
  rawBody: string,
  signatureHeader: string | null,
  webhookSecret: string,
  toleranceSeconds = 300,
): unknown {
  if (!signatureHeader) throw new Error("Missing Stripe-Signature header");

  let timestamp = "";
  const v1: string[] = [];
  for (const part of signatureHeader.split(",")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k === "t") timestamp = v;
    else if (k === "v1") v1.push(v);
  }
  if (!timestamp || v1.length === 0) throw new Error("Malformed Stripe-Signature header");

  const expected = createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");
  const expectedBuf = Buffer.from(expected, "utf8");
  const matched = v1.some((candidate) => {
    const candidateBuf = Buffer.from(candidate, "utf8");
    return candidateBuf.length === expectedBuf.length && timingSafeEqual(candidateBuf, expectedBuf);
  });
  if (!matched) throw new Error("Signature verification failed");

  const ts = Number.parseInt(timestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > toleranceSeconds) {
    throw new Error("Timestamp outside tolerance");
  }

  return JSON.parse(rawBody);
}
