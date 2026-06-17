import { createServiceClient } from "@/lib/supabase/service";
import { log, logError } from "@/lib/debug/log";

/**
 * Record a referral attribution for a brand-new account.
 * Safe to call on every auth completion — it no-ops unless ALL hold:
 *   - a ref code cookie is present
 *   - the referred account is still un-onboarded (i.e. genuinely new)
 *   - the code resolves to a real referrer
 *   - it isn't a self-referral
 * Idempotent via referral_conversions.unique(referred_id). Never throws.
 */
export async function recordReferralAttribution(
  referredUserId: string,
  refCode: string | undefined | null,
): Promise<void> {
  try {
    const code = (refCode ?? "").trim().toUpperCase();
    if (!code) return;

    const svc = await createServiceClient();

    // Gate: only attribute genuinely new (un-onboarded) accounts.
    const { data: referred } = await svc
      .from("profiles")
      .select("onboarding_completed_at")
      .eq("id", referredUserId)
      .maybeSingle();
    if (!referred || referred.onboarding_completed_at) return;

    // Resolve the code to its owner.
    const { data: referrer } = await svc
      .from("profiles")
      .select("id")
      .eq("referral_code", code)
      .maybeSingle();
    if (!referrer) return;                      // unknown code
    if (referrer.id === referredUserId) return; // self-referral

    // unique(referred_id) makes a re-fire a no-op; first referrer wins.
    const { error } = await svc.from("referral_conversions").upsert(
      {
        referrer_id: referrer.id,
        referred_id: referredUserId,
        code_used: code,
        status: "pending",
      },
      { onConflict: "referred_id", ignoreDuplicates: true },
    );
    if (error) {
      logError("referral.attribution", "insert failed", error);
      return;
    }
    log("referral.attribution", "recorded", {
      referrer: referrer.id,
      referred: referredUserId,
    });
  } catch (e) {
    logError("referral.attribution", "unexpected", e);
  }
}
