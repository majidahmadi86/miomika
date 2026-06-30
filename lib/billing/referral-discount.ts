import { createServiceClient } from "@/lib/supabase/service";
import { createDiscountCoupon } from "@/lib/billing/stripe-rest";
import { logError } from "@/lib/debug/log";

/**
 * If the user has referral credit, mint a single-use coupon for the lesser of
 * their balance and the price, to attach to a Checkout session. The balance is
 * only debited later (webhook, on payment success), so an abandoned checkout
 * never burns credit. Returns null on no-credit OR any transient failure —
 * a discount hiccup must never block the purchase itself.
 */
export async function resolveReferralDiscount(
  userId: string,
  priceBaht: number,
): Promise<{ couponId: string; appliedBaht: number } | null> {
  try {
    const svc = await createServiceClient();
    const { data: prof } = await svc
      .from("profiles")
      .select("referral_credit_baht")
      .eq("id", userId)
      .maybeSingle();
    const balance = prof?.referral_credit_baht ?? 0;
    if (balance <= 0) return null;
    const appliedBaht = Math.min(balance, priceBaht);
    if (appliedBaht <= 0) return null;
    const couponId = await createDiscountCoupon(appliedBaht);
    return { couponId, appliedBaht };
  } catch (e) {
    logError("billing", "referral discount resolution failed — proceeding without", e);
    return null;
  }
}
