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

/** Stripe one-time price id for a room pack of the given size (env-configured). */
export function packPriceId(count: number): string | null {
  return process.env[`STRIPE_PRICE_PACK_${count}`] ?? null;
}

/**
 * Create a one-time (payment mode) Checkout Session for a room pack. The room
 * count is carried in metadata so the webhook grants exactly that many credits.
 */
export async function createPackCheckoutSession(params: {
  priceId: string;
  count: number;
  customerEmail: string | null;
  userId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ id: string; url: string | null }> {
  const form = new URLSearchParams();
  form.set("mode", "payment");
  form.set("line_items[0][price]", params.priceId);
  form.set("line_items[0][quantity]", "1");
  form.set("success_url", params.successUrl);
  form.set("cancel_url", params.cancelUrl);
  form.set("client_reference_id", params.userId);
  if (params.customerEmail) form.set("customer_email", params.customerEmail);
  form.set("allow_promotion_codes", "true");
  // The webhook reads these off the completed session to grant room credits.
  form.set("metadata[user_id]", params.userId);
  form.set("metadata[kind]", "room_pack");
  form.set("metadata[room_count]", String(params.count));
  form.set("payment_intent_data[metadata][user_id]", params.userId);
  form.set("payment_intent_data[metadata][kind]", "room_pack");
  form.set("payment_intent_data[metadata][room_count]", String(params.count));

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
    throw new Error(`Stripe pack checkout failed (${res.status}): ${detail}`);
  }
  const json = (await res.json()) as { id: string; url: string | null };
  return { id: json.id, url: json.url };
}

/**
 * Read a subscription's single line item — the bits needed to change its plan:
 * the item id (si_…), the current price id, and the billing interval. Returns
 * null if the subscription has no usable item.
 */
export async function getSubscriptionItem(subscriptionId: string): Promise<{
  itemId: string;
  priceId: string;
  interval: BillingInterval | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
} | null> {
  const res = await fetch(`${STRIPE_API}/subscriptions/${subscriptionId}`, {
    headers: { Authorization: `Bearer ${secretKey()}` },
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Stripe subscription fetch failed (${res.status}): ${detail}`);
  }
  const json = (await res.json()) as {
    items?: {
      data?: Array<{ id?: string; price?: { id?: string; recurring?: { interval?: string } } }>;
    };
    cancel_at_period_end?: boolean;
    current_period_end?: number;
  };
  const item = json.items?.data?.[0];
  if (!item?.id || !item.price?.id) return null;
  const rec = item.price.recurring?.interval;
  const interval: BillingInterval | null =
    rec === "year" ? "yearly" : rec === "month" ? "monthly" : null;
  return {
    itemId: item.id,
    priceId: item.price.id,
    interval,
    cancelAtPeriodEnd: json.cancel_at_period_end === true,
    currentPeriodEnd:
      typeof json.current_period_end === "number"
        ? new Date(json.current_period_end * 1000).toISOString()
        : null,
  };
}

/**
 * Undo a pending cancellation — clear cancel_at_period_end so the subscription
 * keeps renewing. This is the in-app "Resume" (like Claude's). Only meaningful
 * while the sub is still active and set to cancel at period end; harmless
 * otherwise.
 */
export async function resumeSubscription(subscriptionId: string): Promise<void> {
  const form = new URLSearchParams();
  form.set("cancel_at_period_end", "false");
  const res = await fetch(`${STRIPE_API}/subscriptions/${subscriptionId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Stripe resume failed (${res.status}): ${detail}`);
  }
}

/**
 * Preview what an upgrade would cost RIGHT NOW without changing anything — the
 * prorated amount Stripe would charge immediately for the rest of the current
 * period. Lets the UI show "you'll pay ฿X now, then ฿Y/period" before they
 * confirm. Returns amounts in major units (e.g. baht), already divided from
 * Stripe's minor units.
 */
export async function getUpgradeProrationPreview(params: {
  customerId: string;
  subscriptionId: string;
  itemId: string;
  newPriceId: string;
}): Promise<{ proratedNow: number; currency: string } | null> {
  const qs = new URLSearchParams();
  qs.set("customer", params.customerId);
  qs.set("subscription", params.subscriptionId);
  qs.set("subscription_items[0][id]", params.itemId);
  qs.set("subscription_items[0][price]", params.newPriceId);
  qs.set("subscription_proration_behavior", "always_invoice");
  const res = await fetch(`${STRIPE_API}/invoices/upcoming?${qs.toString()}`, {
    headers: { Authorization: `Bearer ${secretKey()}` },
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Stripe proration preview failed (${res.status}): ${detail}`);
  }
  const json = (await res.json()) as { amount_due?: number; currency?: string };
  if (typeof json.amount_due !== "number") return null;
  // Stripe amounts are in the currency's minor unit (satang for THB → /100).
  return { proratedNow: json.amount_due / 100, currency: (json.currency ?? "thb").toUpperCase() };
}

/**
 * Switch a subscription to a new price (the in-app upgrade). Bills the prorated
 * difference immediately against the card on file. payment_behavior is
 * error_if_incomplete so that if the charge can't complete (declined / needs
 * authentication) the call FAILS and the subscription is left untouched — no
 * tier change without a successful payment, and no broken "incomplete" state.
 */
export async function changeSubscriptionPrice(params: {
  subscriptionId: string;
  itemId: string;
  newPriceId: string;
}): Promise<void> {
  const form = new URLSearchParams();
  form.set("items[0][id]", params.itemId);
  form.set("items[0][price]", params.newPriceId);
  form.set("proration_behavior", "always_invoice");
  form.set("payment_behavior", "error_if_incomplete");
  const res = await fetch(`${STRIPE_API}/subscriptions/${params.subscriptionId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Stripe subscription update failed (${res.status}): ${detail}`);
  }
}

/**
 * Create a Stripe Billing Portal session so the customer can update payment,
 * view invoices, and CANCEL their subscription on Stripe's hosted page. Stripe's
 * Services Agreement requires subscription merchants to give customers a clear way
 * to cancel — this is that mechanism.
 */
export async function createBillingPortalSession(params: {
  customerId: string;
  returnUrl: string;
}): Promise<{ url: string | null }> {
  const form = new URLSearchParams();
  form.set("customer", params.customerId);
  form.set("return_url", params.returnUrl);

  const res = await fetch(`${STRIPE_API}/billing_portal/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Stripe billing portal failed (${res.status}): ${detail}`);
  }
  const json = (await res.json()) as { url: string | null };
  return { url: json.url };
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
